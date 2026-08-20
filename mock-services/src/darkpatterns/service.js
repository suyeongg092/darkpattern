// Turns a declarative service description into an Express router.
//
// A service declares its GET pages as block lists (see components.js) and its
// flows as ordered step paths. From that single declaration we derive:
//   - the rendered pages
//   - GET /api/ground-truth?path=...   page-level answer key
//   - GET /api/ground-truth?flow=...   flow-level answer key
//   - GET /api/status                  authoritative subscription state
//
// Flow-level labels exist because the statute's most important types are not
// visible in any single screen. 취소·탈퇴 방해 (§21조의2①4) is defined by the
// cancel path being harder than the signup path, and 반복간섭 (§21조의2①5) is
// defined by repetition — a detector looking at one DOM snapshot structurally
// cannot see either. So the answer key has to be scored at both altitudes.

const express = require("express");
const { getState, setState } = require("../state");
const { page } = require("../layout");
const { ctx: reqCtx } = require("../params");
const { render, labels, esc } = require("./components");
const { describe } = require("./catalog");

function defineService({
  path: servicePath,
  name,
  accent,
  origin,
  defaults = {},
  pages = {},
  flows = {},
  routes,
  // `compliant: true` marks a service that has no dark version at all. Its
  // pages are part of the false-positive control group in every variant, not
  // just under ?variant=clean.
  compliant = false,
  // Brand identity lives with the service, not in the shared shell: six
  // products rendered from one stylesheet read as one template with six logos.
  theme,
  chrome,
}) {
  const router = express.Router();

  // The two variants keep separate subscription state. 시정 후 is a counterfactual
  // — "what if this company had complied?" — not another door into the same
  // account, so cancelling in one world must not show up as cancelled in the
  // other. Practically it also keeps before/after screenshots honest: clicking
  // through the dark flow no longer leaves the clean page reading "해지됨".
  function stateKeyFor(uid, variant) {
    return variant === "clean" ? `${uid}@clean` : uid;
  }

  router.use((req, res, next) => {
    const { uid, variant } = reqCtx(req);
    getState(stateKeyFor(uid, variant), servicePath, defaults);
    next();
  });

  function buildCtx(req) {
    const { uid, attack, variant } = reqCtx(req);
    const stateKey = stateKeyFor(uid, variant);
    const query = (extra = {}) => {
      const all = { uid, attack: attack ? 1 : "", variant: variant === "clean" ? "clean" : "", ...extra };
      return Object.entries(all)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    };
    return {
      service: servicePath,
      accent,
      uid,
      attack,
      variant,
      state: getState(stateKey, servicePath),
      setState: (patch) => setState(stateKey, servicePath, patch),
      q: query(),
      query,
      url: (p, extra) => `/${servicePath}${p}?${query(extra)}`,
      // Only non-default conditions appear in the markup. Emitting
      // `name="attack" value=""` on every page advertised that the switch
      // exists even when it was off — a hint the interface should never give.
      hidden:
        `<input type="hidden" name="uid" value="${esc(uid)}">` +
        (attack ? `<input type="hidden" name="attack" value="1">` : "") +
        (variant === "clean" ? `<input type="hidden" name="variant" value="clean">` : ""),
    };
  }

  // Custom (POST, redirect, bespoke) handlers get first refusal so a service
  // can override a declarative page when it needs to.
  if (routes) routes(router, { buildCtx, page, getState, setState });

  // A page that exists only to slow the user down has no compliant counterpart —
  // 공정위 붙임2 1.(1)의 시정은 그 단계를 고쳐 쓴 것이 아니라 **삭제**한 것이다. So in
  // the clean variant these pages are skipped entirely rather than rendered
  // empty, which is both what compliance actually looks like and the only way
  // the flow-level 단계 수 comparison can show a real difference.
  const skipsInClean = (pagePath) => Boolean(pages[pagePath] && pages[pagePath].skipInClean);

  // Back target = the previous step of whichever flow this page belongs to, so
  // the arrow retraces the path the user actually took. Pages outside a flow
  // (and the first step of one) fall back to the service home; the service home
  // itself goes up to the service list. Skipped-in-clean steps are excluded, or
  // the arrow would point at a page that only redirects forward again.
  function backFor(pagePath, c) {
    if (pagePath === "/") return { href: "/", label: "서비스 목록" };
    const home = { href: `/${servicePath}?${c.q}`, label: "뒤로" };
    for (const flow of Object.values(flows)) {
      const live = c.variant === "clean" ? flow.steps.filter((p) => !skipsInClean(p)) : flow.steps;
      const i = live.indexOf(pagePath);
      if (i > 0) return { href: `/${servicePath}${live[i - 1]}?${c.q}`, label: "뒤로" };
      if (i === 0) return home;
    }
    return home;
  }

  for (const [pagePath, def] of Object.entries(pages)) {
    router.get(pagePath, (req, res) => {
      const c = buildCtx(req);
      if (c.variant === "clean" && def.skipInClean) {
        res.redirect(`/${servicePath}${def.skipInClean}?${c.q}`);
        return;
      }
      const blocks = def.blocks(c);
      // A page may declare `form: { action, submit }` to wrap all of its
      // blocks in one <form>. Inputs inside blocks then post together, which
      // is what signup/consent screens need without letting a block emit a
      // stray unclosed tag.
      const backTo = backFor(pagePath, c);
      const inner = render(blocks, c);
      // The submit button belongs to the page-wide form, so it sits outside every
      // block. Without a wrapper it has no container at all and bleeds to the
      // viewport edge; `.form-submit` gives each service theme something to hang
      // its own gutter and max-width on.
      // `form.align: "grid"` 는 이 페이지의 본문이 사이드바 격자 안에 있다는 뜻이다.
      // 셸이 넣어주는 제출 버튼은 본문 밖에 있으므로, 격자를 모르면 본문과 좌우 끝이
      // 어긋난다. 서비스 테마가 `.form-submit-grid` 로 같은 격자를 재현한다.
      //
      // `form.submit` 는 함수도 받는다. 결제 버튼에 금액을 적으려면 그 금액이 상태에
      // 따라 달라질 수 있어야 한다 — 멤버십 등급이 배송비를 바꾸는데 버튼만 고정된
      // 금액을 말하면, 그 화면은 스스로와 어긋난다.
      const body = def.form
        ? `<form method="post" action="/${servicePath}${def.form.action}">${c.hidden}${inner}
             <div class="form-submit${def.form.align === "grid" ? " form-submit-grid" : ""}">
               <button class="btn btn-primary" type="submit" style="display:block;width:100%"
                       data-testid="${def.form.testid}">${
                         typeof def.form.submit === "function" ? def.form.submit(c) : def.form.submit
                       }</button>
             </div>
           </form>`
        : inner;
      res.send(
        page({
          title: typeof def.title === "function" ? def.title(c) : def.title,
          accent,
          uid: c.uid,
          back: backTo,
          theme,
          header: chrome && chrome.header ? chrome.header(c, backTo, pagePath) : undefined,
          footer: chrome && chrome.footer ? chrome.footer(c, pagePath) : undefined,
          bodyClass: (chrome && chrome.bodyClass) || "",
          body,
        })
      );
    });
  }

  function pageLabels(pagePath, c) {
    const def = pages[pagePath];
    if (!def) return null;
    return labels(def.blocks(c), c);
  }

  function flowTruth(flowName, c) {
    const flow = flows[flowName];
    if (!flow) return null;
    const livePaths =
      c.variant === "clean" ? flow.steps.filter((p) => !skipsInClean(p)) : flow.steps;
    const steps = livePaths.map((p) => ({ path: p, labels: pageLabels(p, c) || [] }));
    const nagCount = steps.filter((s) => s.labels.some((l) => l.pattern === "nagging")).length;
    const flowLabels =
      c.variant === "clean"
        ? []
        : (flow.patterns || []).map((p) => ({
            scope: "flow",
            ...describe(p.pattern),
            note:
              typeof p.note === "function"
                ? p.note({
                    steps,
                    nagCount,
                    darkStepCount: flow.steps.length,
                    cleanStepCount: flow.steps.filter((p2) => !skipsInClean(p2)).length,
                    signupStepCount: flow.signupStepCount ?? null,
                  })
                : p.note,
          }));
    return {
      service: servicePath,
      flow: flowName,
      label: flow.label,
      metrics: {
        stepCount: steps.length,
        // Both counts on every response, so one call answers "얼마나 더 어려운가"
        // without having to fetch the other variant and diff it.
        darkStepCount: flow.steps.length,
        cleanStepCount: flow.steps.filter((p) => !skipsInClean(p)).length,
        signupStepCount: flow.signupStepCount ?? null,
        nagCount,
        skippedInClean: flow.steps.filter(skipsInClean),
        totalLabels: steps.reduce((a, s) => a + s.labels.length, 0) + flowLabels.length,
      },
      labels: flowLabels,
      steps,
    };
  }

  router.get("/api/ground-truth", (req, res) => {
    const c = buildCtx(req);
    if (req.query.flow) {
      const truth = flowTruth(req.query.flow, c);
      if (!truth) return res.status(404).json({ error: `unknown flow: ${req.query.flow}` });
      return res.json(truth);
    }
    if (req.query.path) {
      const l = pageLabels(req.query.path, c);
      if (!l) return res.status(404).json({ error: `unknown path: ${req.query.path}` });
      const skipped = c.variant === "clean" && skipsInClean(req.query.path);
      return res.json({
        service: servicePath,
        path: req.query.path,
        // A skipped page never renders in this variant, so a detector should
        // never be asked about it — flagged so the scorer can ignore it too.
        skipped,
        labels: l,
      });
    }
    // No selector: return the whole answer key for this service, which is what
    // scripts/score.js enumerates.
    res.json({
      service: servicePath,
      name,
      pages: Object.keys(pages)
        .filter((p) => !(c.variant === "clean" && skipsInClean(p)))
        .map((p) => ({ path: p, labels: pageLabels(p, c) })),
      flows: Object.keys(flows).map((f) => flowTruth(f, c)),
    });
  });

  router.get("/api/status", (req, res) => {
    const c = buildCtx(req);
    res.json({ service: servicePath, uid: c.uid, ...c.state });
  });

  return {
    router,
    meta: {
      path: servicePath,
      name,
      accent,
      origin,
      compliant,
      pages: Object.keys(pages),
      flows: Object.keys(flows),
    },
  };
}

module.exports = { defineService };
