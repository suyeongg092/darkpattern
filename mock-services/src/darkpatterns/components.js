// Dark-pattern blocks. A page is declared as a list of blocks, and the same
// list is projected two ways:
//
//   render(blocks, ctx)  -> HTML the user (and the detector) sees
//   labels(blocks, ctx)  -> ground-truth annotations for scoring
//
// Keeping both projections on one declaration is the whole point: if the page
// changes, its answer key changes with it, so the two can never drift apart.
// A hand-maintained label file would silently rot the moment someone tweaks a
// button, and every accuracy number computed from it would be wrong.
//
// Two hard rules:
//   1. Nothing in the rendered HTML may name a pattern. Blocks only emit a
//      neutral `data-el` anchor; the mapping anchor -> pattern lives in the
//      ground-truth API, which the detector must not read. Otherwise the
//      detector is just reading the answer key off the page.
//   2. `clean` is the 공정위 "시정 후" version of the same block, not a blank.
//      Clean pages are the false-positive control group, so they have to be
//      realistic pages that merely happen to be compliant.

const { describe } = require("./catalog");

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// A block is { el, patterns, dark(ctx), clean(ctx) }. `patterns` entries are
// { pattern, note } — note explains *why* this specific instance counts, which
// is what makes the ground truth reviewable by a human (and by the judges).
function block({ el, patterns = [], dark, clean }) {
  // 패턴이 없는 블록은 다크패턴이 아니라 그냥 화면 내용이다 — 헤더, 상품 정보,
  // 주문 요약 같은 것들. 시정 후에도 당연히 그대로 나와야 한다.
  //
  // 기본값이 빈 문자열이던 시절에는 `clean` 을 적지 않은 중립 블록이 시정 후에
  // 통째로 사라졌고, 그래서 StreamNow·OrderNow·CloudStudio·PrimeVault 의 홈과
  // SuperCart 의 상품·주문 화면 등 24개 화면이 시정 후에 백지로 렌더됐다.
  //
  // 패턴이 있는 블록은 다르다. 만류 배너처럼 '단계를 지우는 것'이 시정인 경우가
  // 있으므로 명시하지 않으면 삭제로 남겨 둔다 — 다만 그건 의도한 삭제여야 한다.
  const fallback = patterns.length ? () => "" : dark;
  return { el, patterns, dark, clean: clean || fallback };
}

function wrap(el, html) {
  if (!html) return "";
  return `<div data-el="${el}">${html}</div>`;
}

// `{{HIDDEN}}` in any block expands to the uid/attack/variant hidden inputs, so
// a block that emits its own <form> doesn't have to thread ctx through itself.
function render(blocks, ctx) {
  return blocks
    .filter(Boolean)
    .map((b) => wrap(b.el, (ctx.variant === "clean" ? b.clean : b.dark)(ctx)))
    .join("\n")
    .replace(/\{\{HIDDEN\}\}/g, ctx.hidden);
}

function labels(blocks, ctx) {
  // A clean page is compliant by construction, so it carries no labels —
  // anything a detector reports there is a false positive.
  if (ctx.variant === "clean") return [];
  return blocks
    .filter(Boolean)
    .flatMap((b) =>
      b.patterns.map((p) => ({
        el: b.el,
        selector: `[data-el="${b.el}"]`,
        ...describe(p.pattern),
        note: p.note,
      }))
    );
}

// ── neutral building blocks (no pattern) ────────────────────────────────

function plain(el, html) {
  return block({ el, dark: () => html, clean: () => html });
}

function card(el, inner) {
  return plain(el, `<div class="card">${inner}</div>`);
}

// ── pattern blocks ──────────────────────────────────────────────────────

// Two choices with deliberately unequal visual weight (잘못된 계층구조).
// Clean version: both choices rendered as equally-weighted buttons, which is
// exactly the 공정위 시정 후 form ('자동결제 해지' / '중도해지' 병렬 제공).
function choicePair({ el, patterns, keep, leave }) {
  const link = (o, cls, style = "") =>
    o.method === "post"
      ? `<form method="post" action="${o.href}" style="margin:0">{{HIDDEN}}<button class="${cls}" style="${style}" type="submit" data-testid="${o.testid}">${o.label}</button></form>`
      : `<a class="${cls}" style="${style}" href="${o.href}" data-testid="${o.testid}">${o.label}</a>`;

  return block({
    el,
    patterns,
    dark: (ctx) =>
      `${link(keep, "btn btn-primary", "display:block")}
       <div style="text-align:center;margin-top:14px">
         ${link(leave, "btn-quiet")}
       </div>`.replace(/\{\{HIDDEN\}\}/g, ctx.hidden),
    clean: (ctx) =>
      `<div class="choice-equal">
         ${link(keep, "btn btn-outline")}
         ${link(leave, "btn btn-outline")}
       </div>`.replace(/\{\{HIDDEN\}\}/g, ctx.hidden),
  });
}

// Material terms rendered small/low-contrast so they are technically present
// but practically unreadable — the 웨이브 "첫 달 100원" case, and the shape
// 공정위 calls 숨은갱신 when it concerns a free-to-paid conversion.
function fineprint({ el, patterns, text }) {
  return block({
    el,
    patterns,
    dark: () =>
      `<p style="font-size:10px;color:#cfcfcf;line-height:1.3;margin:6px 0 0">${text}</p>`,
    clean: () =>
      `<div class="notice"><b>결제 안내</b><p style="margin:4px 0 0;font-size:14px;color:#1a1a1a">${text}</p></div>`,
  });
}

// A radio group whose default selection favours the seller (특정옵션 사전선택).
// Clean version: nothing preselected, so the user has to make a real choice.
// `cleanLabel` lets an option carry a shaming wording in the dark variant and a
// neutral one in the clean variant — the 쿠팡 '혜택 포기하기' shape, where the
// decline option is worded to make declining feel like a loss.
//
// `required: true` marks the group as a real choice the user must make. It
// matters most in the clean variant: with the preselection removed there is no
// default, so submitting without choosing must be blocked rather than silently
// falling through to whatever the server treats as "not the cancel option".
function radioGroup({ el, patterns, name, options, preselect, legend, required = false }) {
  const opts = (checked) =>
    options
      .map(
        // `sub` is the seller-favouring nudge (social proof on the default) and
        // appears only in the dark variant. `desc` explains what the option
        // actually does and appears in both — an option the user cannot
        // understand is its own dark pattern, so the clean variant must keep it.
        (o) => `<label${o.dim && checked ? ' style="font-size:12px;color:#999"' : ""}>
            <input type="radio" name="${name}" value="${o.value}"${
          checked && o.value === preselect ? " checked" : ""
        }${required ? " required" : ""} data-testid="${el}-${o.value}"> ${checked ? o.label : o.cleanLabel || o.label}
            ${o.desc ? `<div style="font-size:11.5px;color:#777;margin:2px 0 0 24px">${o.desc}</div>` : ""}
            ${o.sub && checked ? `<div style="font-size:11px;color:#888;margin:2px 0 0 24px">${o.sub}</div>` : ""}
          </label>`
      )
      .join("");
  const shell = (checked) =>
    `<div class="card">${legend ? `<p style="margin:0 0 8px">${legend}</p>` : ""}<fieldset>${opts(checked)}</fieldset></div>`;
  return block({ el, patterns, dark: () => shell(true), clean: () => shell(false) });
}

// Consent checkboxes that hide an opt-in among required items, with no
// 필수/선택 marking — 공정위 붙임2 5.(5)의 시정 대상 그대로.
//
// `required` items carry the HTML attribute in both variants: the dark pattern
// is that the user cannot *tell* which items are mandatory, not that consent
// goes uncollected. This also reproduces the exact behaviour 공정위 documented —
// press the button with nothing ticked and the form only then reveals which
// items were compulsory.
function consentList({ el, patterns, items }) {
  const row = (i, marked) =>
    `<label><input type="checkbox" name="${i.name}"${
      i.preChecked && !marked ? " checked" : ""
    }${i.required ? " required" : ""} data-testid="${el}-${i.name}"> ${
      marked ? `<b>${i.required ? "(필수)" : "(선택)"}</b> ` : ""
    }${marked ? i.cleanLabel || i.label : i.label}</label>`;
  const shell = (marked) =>
    `<div class="card"><fieldset>${items.map((i) => row(i, marked)).join("")}</fieldset></div>`;
  return block({ el, patterns, dark: () => shell(false), clean: () => shell(true) });
}

// Headline price that omits mandatory add-ons, revealed later (순차공개 가격책정).
// Clean version shows the all-in total up front, per 공정위 붙임2 4.
function priceBreakdown({ el, patterns, label, base, extras, unit = "원" }) {
  const fmt = (n) => n.toLocaleString() + unit;
  const total = base + extras.reduce((a, e) => a + e.amount, 0);
  return block({
    el,
    patterns,
    dark: () =>
      `<div class="card">
         <div style="font-size:13px;color:#888">${label}</div>
         <div style="font-size:26px;font-weight:800" data-testid="${el}-headline">${fmt(base)}</div>
         <p style="font-size:10px;color:#d0d0d0;margin:4px 0 0">${extras.map((e) => e.name).join(" / ")} 별도</p>
       </div>`,
    clean: () =>
      `<div class="card">
         <div style="font-size:13px;color:#888">${label}</div>
         <div style="font-size:26px;font-weight:800" data-testid="${el}-headline">${fmt(total)}</div>
         <div style="font-size:12px;color:#666;margin-top:6px">
           ${[{ name: "상품금액", amount: base }, ...extras]
             .map((e) => `<div style="display:flex;justify-content:space-between"><span>${e.name}</span><span>${fmt(e.amount)}</span></div>`)
             .join("")}
         </div>
       </div>`,
  });
}

// Interstitial that re-asks after the user already chose to leave (반복간섭).
// No clean counterpart: the compliant flow simply does not have this step.
// `stay.method === "post"` submits instead of navigating, so accepting a
// retention offer actually records the new state. A "pause" or "50% off" button
// that quietly leaves the subscription untouched makes the demo lie: the user
// accepts the offer, lands back on a home screen that says nothing changed, and
// the flow stops making sense.
function nagOverlay({ el, patterns, title, body, stay, leave }) {
  const stayControl =
    stay.method === "post"
      ? `<form method="post" action="${stay.href}" style="margin:0">{{HIDDEN}}
           <button class="btn btn-primary" type="submit" data-testid="${el}-stay">${stay.label}</button>
         </form>`
      : `<a class="btn btn-primary" style="display:block" href="${stay.href}" data-testid="${el}-stay">${stay.label}</a>`;
  return block({
    el,
    patterns,
    dark: () =>
      `<div class="panel-raised">
         <h3 style="margin:0 0 6px">${title}</h3>
         <p style="font-size:13px;color:#888;margin:0 0 14px">${body}</p>
         ${stayControl}
         <div style="text-align:center;margin-top:12px">
           <a class="btn-ghost" href="${leave.href}" data-testid="${el}-leave">${leave.label}</a>
         </div>
       </div>`,
  });
}

// Countdown / stock banners that are actually static (거짓 긴급성·희소성).
function urgencyBanner({ el, patterns, text }) {
  return block({
    el,
    patterns,
    dark: () => `<div class="strip" data-testid="${el}">${text}</div>`,
  });
}

// A mandatory step unrelated to the request itself (강제 행동요구).
function requiredStep({ el, patterns, inner, cleanInner = "" }) {
  return block({ el, patterns, dark: () => inner, clean: () => cleanInner });
}

// Raw escape hatch for a block that is a dark pattern but has a bespoke shape
// (e.g. a comparison table designed to be uncomparable). Caller supplies both
// variants directly.
function custom({ el, patterns, dark, clean }) {
  return block({ el, patterns, dark, clean });
}

module.exports = {
  esc,
  block,
  render,
  labels,
  plain,
  card,
  choicePair,
  fineprint,
  radioGroup,
  consentList,
  priceBreakdown,
  nagOverlay,
  urgencyBanner,
  requiredStep,
  custom,
};
