// CloudStudio presentation layer.
//
// The other three services are all single-ground layouts — one background colour
// with cards floating on it. Two of them are light grey with a red accent, which
// is how this service ended up indistinguishable from SuperCart. So the
// separation here is structural rather than chromatic:
//
//   - a permanent dark rail (left on the laptop, a dark dock on handhelds) with
//     a light canvas beside it, the two-tone chrome professional creative tools
//     actually use;
//   - no floating cards. Panels sit flush on the canvas and are separated by
//     hairlines, so the page reads as one continuous console surface;
//   - 3px corners, 12.5px base, monospace for every identifier and amount;
//   - amber for state and navigation, red reserved strictly for destructive
//     actions, so red is a signal here rather than a brand colour.
//
// Rule carried over: never combine `padding` shorthand with `.shell` on the same
// element, or the shell's horizontal padding silently disappears.

const { APPS } = require("./data");

const THEME = `
  :root {
    --chrome:   #17191D;
    --chrome-2: #21242A;
    --chrome-l: #2C3038;
    --on-dark:  #D9DCE1;
    --on-dark-2:#878D97;
    --canvas:   #F2F1EE;
    --sheet:    #FFFFFF;
    --ink:      #191A1C;
    --ink-2:    #565A61;
    --ink-3:    #8B8F97;
    --rule:     #E0DFDA;
    --rule-2:   #CFCEC8;
    --amber:    #B8801F;
    --amber-l:  #F6EFE0;
    --danger:   #C0392F;
    --ok:       #2E7D5B;
    --rail-w:   216px;
    --shell-w:  1040px;
    --gutter:   16px;
    --mono: "Cascadia Mono", "D2Coding", Consolas, "Courier New", monospace;
  }
  @media (min-width: 960px) { :root { --gutter: 32px; } }

  body {
    background: var(--canvas); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
                 "Malgun Gothic", "맑은 고딕", "Segoe UI", sans-serif;
    font-size: 12.5px; line-height: 1.5;
    padding-bottom: 66px;
  }
  @media (min-width: 960px) { body { padding-bottom: 0; padding-left: var(--rail-w); } }
  a { color: inherit; text-decoration: none; }
  h1, h2, h3 { margin: 0; line-height: 1.28; letter-spacing: -.012em; }
  p { margin: 0; }
  .shell { max-width: var(--shell-w); margin: 0 auto; padding-left: var(--gutter); padding-right: var(--gutter); }
  .col { max-width: 600px; margin-left: auto; margin-right: auto; }
  .mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }

  /* ── 다크 레일: 데스크톱에서 항상 보이는 앱 크롬 ─────── */
  .rail {
    position: fixed; left: 0; top: 0; bottom: 0; width: var(--rail-w); z-index: 40;
    background: var(--chrome); color: var(--on-dark);
    display: none; flex-direction: column; padding: 18px 0;
  }
  @media (min-width: 960px) { .rail { display: flex; } }
  .rail-mark { font-size: 14px; font-weight: 700; letter-spacing: -.02em; padding: 0 18px 18px; }
  .rail-mark i { font-style: normal; color: var(--amber); }
  .rail-g { font-size: 10px; letter-spacing: .1em; color: var(--on-dark-2); padding: 14px 18px 5px; }
  .rail a { display: block; padding: 6px 18px; font-size: 12.5px; color: var(--on-dark-2); }
  .rail a:hover { color: var(--on-dark); background: var(--chrome-2); }
  .rail a[aria-current] { color: #fff; background: var(--chrome-2); box-shadow: inset 3px 0 0 var(--amber); }
  .rail-foot { margin-top: auto; padding: 14px 18px 0; border-top: 1px solid var(--chrome-l);
               font-size: 11px; color: var(--on-dark-2); }
  .rail-foot b { display: block; color: var(--on-dark); font-size: 12px; font-weight: 600; }

  /* 좁은 화면: 상단 얇은 크롬 바 + 하단 다크 독 */
  .bar { background: var(--chrome); color: var(--on-dark); }
  @media (min-width: 960px) { .bar { display: none; } }
  .bar-in { display: flex; align-items: center; gap: 10px; height: 46px; }
  .bar-mark { font-size: 14px; font-weight: 700; letter-spacing: -.02em; }
  .bar-mark i { font-style: normal; color: var(--amber); }
  .bar-who { margin-left: auto; font-size: 11.5px; color: var(--on-dark-2); }

  .dock-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid;
              grid-template-columns: repeat(4, 1fr); background: var(--chrome);
              padding-bottom: env(safe-area-inset-bottom, 0px); }
  @media (min-width: 960px) { .dock-nav { display: none; } }
  .dock-nav a { display: flex; flex-direction: column; align-items: center; gap: 2px;
                padding: 8px 0 7px; font-size: 9.5px; color: var(--on-dark-2); }
  .dock-nav a[aria-current] { color: var(--amber); }
  .dock-nav b { font-size: 14px; font-weight: 400; line-height: 1; }

  /* ── 콘솔 본문 ───────────────────────────────────────── */
  .wrap { padding-top: 20px; padding-bottom: 30px; }
  .path { font-size: 11px; color: var(--ink-3); padding-bottom: 7px; }
  .head { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
  @media (min-width: 960px) { .head { font-size: 24px; } }
  .head-sub { font-size: 12.5px; color: var(--ink-2); margin-bottom: 18px; }

  /* 떠 있지 않은 연속 패널 — 카드 그림자도 여백도 없다 */
  .panel { background: var(--sheet); border: 1px solid var(--rule); border-radius: 3px; }
  .panel + .panel { margin-top: 14px; border-top-left-radius: 3px; border-top-right-radius: 3px; }
  .panel-t { display: flex; align-items: baseline; gap: 8px; font-size: 11px; font-weight: 700;
             letter-spacing: .04em; color: var(--ink-2); padding: 9px 14px;
             border-bottom: 1px solid var(--rule); }
  @media (min-width: 960px) { .panel-t { padding-left: 18px; padding-right: 18px; } }
  .panel-t span { margin-left: auto; font-weight: 400; letter-spacing: 0; color: var(--ink-3); }
  .panel-b { padding: 14px; }
  @media (min-width: 960px) { .panel-b { padding: 16px 18px; } }

  .spec { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 12.5px; }
  .spec + .spec { border-top: 1px solid var(--rule); }
  .spec dt { color: var(--ink-2); }
  .spec dd { margin: 0; font-family: var(--mono); font-variant-numeric: tabular-nums; }

  .grid-t { width: 100%; border-collapse: collapse; font-size: 12px; }
  .grid-t th { text-align: left; font-weight: 600; color: var(--ink-3); font-size: 10.5px;
               letter-spacing: .03em; padding: 7px 14px; border-bottom: 1px solid var(--rule); white-space: nowrap; }
  .grid-t td { padding: 9px 14px; border-bottom: 1px solid var(--rule); vertical-align: top; }
  @media (min-width: 960px) { .grid-t th, .grid-t td { padding-left: 18px; padding-right: 18px; } }
  .grid-t tr:last-child td { border-bottom: none; }
  .grid-t .num { text-align: right; font-family: var(--mono); font-variant-numeric: tabular-nums; }
  .scroll-x { overflow-x: auto; }

  .tag { display: inline-block; font-size: 10px; font-weight: 700; padding: 1px 5px;
         border-radius: 2px; background: var(--canvas); border: 1px solid var(--rule-2); color: var(--ink-2); }
  .tag-on { background: var(--amber-l); border-color: #E5D3AB; color: var(--amber); }
  .tag-warn { background: #FBECEA; border-color: #F0CFCB; color: var(--danger); }

  .apps > * { display: flex; gap: 11px; align-items: center; padding: 11px 14px;
              border-bottom: 1px solid var(--rule); min-height: 58px; }
  @media (min-width: 960px) { .apps > * { padding-left: 18px; padding-right: 18px; } }
  .apps > *:last-child { border-bottom: none; }
  .app-i { width: 30px; height: 30px; border-radius: 3px; flex: none; }
  .app-n { display: block; font-size: 12.5px; font-weight: 600; }
  .app-m { display: block; font-size: 10.5px; color: var(--ink-3); font-family: var(--mono); }
  .app-s { margin-left: auto; }

  .bar-meter { height: 5px; background: var(--rule); border-radius: 2px; overflow: hidden; margin: 6px 0 5px; }
  .bar-meter i { display: block; height: 100%; background: var(--amber); }

  /* ── 동작 ────────────────────────────────────────────── */
  .act { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
         min-height: 44px; padding: 0 16px; border-radius: 3px; border: 1px solid transparent;
         font-size: 13px; font-weight: 600; cursor: pointer; text-align: center; }
  .act-solid { background: var(--chrome); color: #fff; }
  .act-solid:hover { background: #000; }
  .act-danger { background: var(--danger); color: #fff; }
  .act-danger:hover { background: #A72E25; }
  .act-quiet { background: var(--sheet); color: var(--ink); border-color: var(--rule-2); }
  .act-quiet:hover { border-color: var(--ink-3); }
  .act-full { width: 100%; }
  .act-min { background: none; border: none; padding: 0; min-height: 0; font-size: 11.5px;
             font-weight: 400; color: var(--ink-3); text-decoration: underline; cursor: pointer; }
  .act-row { display: flex; gap: 8px; }
  .act-row > * { flex: 1 1 0; }
  .act-row form { display: flex; margin: 0; }
  .act-row form .act { width: 100%; }

  /* 셸이 주입하는 제출 버튼 */
  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
         padding: 0 16px; border-radius: 3px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn-primary { background: var(--chrome); color: #fff; }
  .form-submit { max-width: var(--shell-w); margin: 14px auto 0;
                 padding-left: var(--gutter); padding-right: var(--gutter); }
  .form-submit > .btn { max-width: 600px; margin-left: auto; margin-right: auto; }

  .callout { background: var(--sheet); border: 1px solid var(--rule);
             border-left: 3px solid var(--amber); border-radius: 3px; padding: 11px 13px; font-size: 12.5px; }
  .callout b { display: block; font-size: 11px; letter-spacing: .03em; color: var(--ink-2); margin-bottom: 3px; }
  .callout-danger { border-left-color: var(--danger); }
  .micro { font-size: 10px; color: #B7B5AE; line-height: 1.5; }

  details.acc { border: 1px solid var(--rule); border-radius: 3px; background: var(--sheet); }
  details.acc > summary { padding: 10px 13px; font-size: 12.5px; font-weight: 600; cursor: pointer;
                          list-style: none; display: flex; align-items: center; }
  details.acc > summary::after { content: "+"; margin-left: auto; color: var(--ink-3); font-family: var(--mono); }
  details.acc[open] > summary::after { content: "−"; }
  details.acc > summary::-webkit-details-marker { display: none; }
  details.acc .acc-b { padding: 0 13px 12px; font-size: 12.5px; color: var(--ink-2); }

  .dock { position: sticky; bottom: 0; z-index: 20;
          margin-left: calc(var(--gutter) * -1); margin-right: calc(var(--gutter) * -1); margin-top: 14px;
          padding: 10px var(--gutter) calc(10px + env(safe-area-inset-bottom, 0px));
          background: linear-gradient(180deg, rgba(242,241,238,0), var(--canvas) 30%); }
  @media (min-width: 960px) { .dock { position: static; margin: 14px 0 0; padding: 0; background: none; } }

  .legal { border-top: 1px solid var(--rule); margin-top: 26px; padding-top: 16px; padding-bottom: 22px;
           font-size: 11px; color: var(--ink-3); }
  @media (max-width: 959px) { .legal { padding-bottom: 76px; } }
  .legal-l { display: flex; flex-wrap: wrap; gap: 5px 13px; margin-bottom: 7px; }
  .legal-c { font-size: 10.5px; line-height: 1.7; color: #ABA9A2; }
`;

const NAV = [
  ["개요", "overview", ""],
  ["앱 및 업데이트", "apps", ""],
  ["기기", "devices", ""],
];
const NAV2 = [
  ["플랜 및 결제", "plan", "/cancel/hub"],
  ["청구 이력", "billing", "/cancel/hub"],
  ["약관 및 계약", "terms", "/cancel/hub"],
];

const won = (n) => n.toLocaleString() + "원";
const tint = (hue) => `background: linear-gradient(140deg, hsl(${hue} 52% 52%), hsl(${(hue + 26) % 360} 48% 38%))`;

function appRow(a) {
  const tag =
    a.state === "설치됨"
      ? `<span class="tag tag-on">설치됨</span>`
      : a.state === "업데이트 필요"
      ? `<span class="tag tag-warn">업데이트</span>`
      : `<span class="tag">미설치</span>`;
  return `<div>
    <span class="app-i" style="${tint(a.hue)}"></span>
    <span style="min-width:0">
      <span class="app-n">${a.name}</span>
      <span class="app-m">${a.role} · v${a.ver} · ${a.size}</span>
    </span>
    <span class="app-s">${tag}</span>
  </div>`;
}

// The rail is chrome, not content: it is always present on the laptop, so it
// carries navigation and the licence summary rather than a page heading.
function rail(c, current) {
  const item = ([label, key, href]) =>
    `<a href="/cloudstudio${href}?${c.q}"${key === current ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<nav class="rail">
      <div class="rail-mark">Cloud<i>Studio</i></div>
      <div class="rail-g">내 앱</div>
      ${NAV.map(item).join("")}
      <div class="rail-g">계정</div>
      ${NAV2.map(item).join("")}
      <div class="rail-foot">
        <b>${c.uid}</b>
        개인 · 라이선스 1석
      </div>
    </nav>`;
}

function header(c, back, pagePath) {
  return `<div class="bar"><div class="shell"><div class="bar-in">
      <span class="bar-mark">Cloud<i>Studio</i></span>
      <span class="bar-who">${c.uid}</span>
    </div></div></div>`;
}

function footer(c, pagePath) {
  const tabs = [
    ["내 앱", "▣", ""],
    ["학습", "▤", ""],
    ["요금제", "▧", "/plans"],
    ["계정", "▨", "/cancel/hub"],
  ];
  const cur = pagePath.startsWith("/cancel") ? "/cancel/hub" : pagePath === "/plans" ? "/plans" : "";
  return `<div class="shell"><footer class="legal">
      <div class="legal-l">
        <a href="/cloudstudio?${c.q}">이용약관</a><a href="/cloudstudio?${c.q}">개인정보처리방침</a>
        <a href="/cloudstudio?${c.q}">라이선스 정책</a><a href="/cloudstudio?${c.q}">고객 지원</a>
        <a href="/cloudstudio?${c.q}">시스템 요구사항</a>
      </div>
      <p class="legal-c">클라우드스튜디오 코리아 유한회사 · 대표 한지오 · 서울특별시 종로구 종로1길 50 8층<br>
      사업자등록번호 120-87-55031 · 통신판매업 제2021-서울종로-01188호 · 기술지원 1670-3355 (평일 09:00~18:00)</p>
    </footer></div>
    <nav class="dock-nav">${tabs
      .map(([l, i, h]) => `<a href="/cloudstudio${h}?${c.q}"${h === cur ? ' aria-current="page"' : ""}><b>${i}</b>${l}</a>`)
      .join("")}</nav>`;
}

module.exports = { THEME, header, footer, rail, appRow, tint, won };
