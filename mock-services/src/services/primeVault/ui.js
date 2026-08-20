// PrimeVault presentation layer.
//
// A consumer membership account portal — the interface people visit to manage a
// subscription they already have, not to be sold one. Everything follows from
// that:
//
//   - two-tier chrome: a thin utility strip over a plain text navigation row.
//     No other service in the set has a utility strip, and it is the shape
//     established consumer account portals actually use;
//   - no cards. Section headings over definition-list rows, separated by rules,
//     so a page reads as an account record rather than a dashboard;
//   - restrained type. Nothing above 22px and no display numerals — weight and
//     rules carry the hierarchy instead of size;
//   - one dark brand tone (deep petrol) with functional status colours only. No
//     decorative accent, no gradients, no elevation: borders and spacing.
//
// Rule carried over: never combine `padding` shorthand with `.shell` on the same
// element, or the shell's horizontal padding silently disappears.

const THEME = `
  :root {
    --ink:     #1A1E20;
    --ink-2:   #52585C;
    --ink-3:   #878E93;
    --rule:    #DFE3E4;
    --rule-2:  #C6CBCD;
    --page:    #FFFFFF;
    --band:    #F5F7F7;
    --brand:   #173A42;
    --brand-d: #0F2A30;
    --ok:      #1F6B4B;
    --alert:   #9E3B33;
    --doc-w:   1060px;
    --gutter:  18px;
  }
  @media (min-width: 900px) { :root { --gutter: 34px; } }

  body {
    background: var(--page); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
                 "Malgun Gothic", "맑은 고딕", "Segoe UI", sans-serif;
    font-size: 13.5px; line-height: 1.6;
    padding-bottom: 70px;
  }
  @media (min-width: 900px) { body { padding-bottom: 0; } }
  a { color: inherit; text-decoration: none; }
  h1, h2, h3 { margin: 0; line-height: 1.3; letter-spacing: -.012em; }
  p { margin: 0; }
  .shell { max-width: var(--doc-w); margin: 0 auto; padding-left: var(--gutter); padding-right: var(--gutter); }
  .col { max-width: 620px; margin-left: auto; margin-right: auto; }
  .nums { font-variant-numeric: tabular-nums; }

  /* ── 2단 크롬: 유틸리티 스트립 + 텍스트 내비 ─────────── */
  .util { background: var(--band); border-bottom: 1px solid var(--rule); }
  .util-in { display: flex; align-items: center; gap: 14px; height: 30px;
             font-size: 11.5px; color: var(--ink-3); }
  .util-in a:hover { color: var(--ink-2); }
  .util-r { margin-left: auto; display: flex; gap: 14px; }

  .mast { border-bottom: 1px solid var(--rule); position: sticky; top: 0; z-index: 40; background: var(--page); }
  .mast-in { display: flex; align-items: center; gap: 26px; height: 50px; }
  @media (min-width: 900px) { .mast-in { height: 58px; } }
  .mark { font-size: 16px; font-weight: 700; letter-spacing: .02em; white-space: nowrap; color: var(--brand); }
  .mark b { font-weight: 700; color: var(--ink); }
  .gnav { display: none; gap: 22px; font-size: 13px; color: var(--ink-2); }
  @media (min-width: 900px) { .gnav { display: flex; } }
  .gnav a:hover { color: var(--ink); }
  .gnav a[aria-current] { color: var(--ink); font-weight: 700; border-bottom: 2px solid var(--brand); padding-bottom: 2px; }
  .mast-r { margin-left: auto; display: flex; align-items: center; gap: 12px; font-size: 12.5px; color: var(--ink-2); }
  .who { display: inline-flex; align-items: center; gap: 6px; }
  .who i { width: 23px; height: 23px; border-radius: 3px; background: var(--brand); color: #fff;
           display: grid; place-items: center; font-style: normal; font-size: 10.5px; font-weight: 700; }

  .dock-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid;
              grid-template-columns: repeat(4, 1fr); background: var(--page);
              border-top: 1px solid var(--rule); padding-bottom: env(safe-area-inset-bottom, 0px); }
  @media (min-width: 900px) { .dock-nav { display: none; } }
  .dock-nav a { display: flex; align-items: center; justify-content: center;
                padding: 12px 0; font-size: 11.5px; color: var(--ink-3); }
  .dock-nav a[aria-current] { color: var(--brand); font-weight: 700; }

  /* ── 문서 골격: 카드 없음, 괘선과 정의목록 ───────────── */
  .doc { padding-top: 18px; padding-bottom: 32px; }
  .split { display: block; }
  @media (min-width: 900px) {
    .split { display: grid; grid-template-columns: minmax(0,1fr) 268px; gap: 44px; align-items: start; }
    .aside { position: sticky; top: 78px; }
  }
  .aside { margin-top: 24px; }
  @media (min-width: 900px) { .aside { margin-top: 0; } }

  .crumb { font-size: 11.5px; color: var(--ink-3); margin-bottom: 8px; }
  .crumb a:hover { color: var(--ink-2); }
  .title { font-size: 19px; font-weight: 700; }
  @media (min-width: 900px) { .title { font-size: 22px; } }
  .lede { font-size: 13.5px; color: var(--ink-2); margin-top: 5px; }

  .sec { border-top: 1px solid var(--rule); padding-top: 16px; margin-top: 22px; }
  .sec-h { font-size: 12px; font-weight: 700; letter-spacing: .02em; color: var(--ink-2); margin-bottom: 10px; }
  .sec-h b { font-weight: 400; color: var(--ink-3); }

  /* 정의목록 행 — 이 서비스의 기본 단위 */
  .line { display: flex; justify-content: space-between; gap: 14px; align-items: baseline;
          padding: 9px 0; border-bottom: 1px solid var(--rule); }
  .line:last-child { border-bottom: none; }
  .line-l { min-width: 0; }
  .line-n { font-size: 13.5px; }
  .line-d { font-size: 11.5px; color: var(--ink-3); margin-top: 1px; }
  .line-v { font-size: 13.5px; font-weight: 600; white-space: nowrap; }
  .line-v.mute { font-weight: 400; color: var(--ink-3); }
  .line-v.was { font-weight: 400; color: var(--ink-3); text-decoration: line-through; font-size: 12px; }

  .grid2 { display: grid; grid-template-columns: 1fr; gap: 0 34px; }
  @media (min-width: 640px) { .grid2 { grid-template-columns: repeat(2, 1fr); } }

  .flag { display: inline-block; font-size: 10.5px; font-weight: 700; padding: 1.5px 6px;
          border-radius: 2px; border: 1px solid var(--rule-2); color: var(--ink-2); background: var(--page); }
  .flag-on { border-color: #BFD8CC; color: var(--ok); background: #F2F8F5; }
  .flag-off { color: var(--ink-3); background: var(--band); }

  .band { background: var(--band); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
          margin-left: calc(var(--gutter) * -1); margin-right: calc(var(--gutter) * -1);
          padding: 13px var(--gutter); margin-top: 18px; font-size: 13px; }
  .band b { color: var(--ink); }
  .band-alert { background: #FBF3F2; border-color: #EDD9D7; }
  .band-alert b { color: var(--alert); }

  .meterline { height: 5px; background: var(--rule); border-radius: 2px; overflow: hidden; margin: 7px 0 4px; }
  .meterline i { display: block; height: 100%; background: var(--brand); }
  .meterline i.mute { background: var(--rule-2); }

  /* ── 동작 ────────────────────────────────────────────── */
  .act { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
         min-height: 46px; padding: 0 18px; border-radius: 3px; border: 1px solid transparent;
         font-size: 14px; font-weight: 600; cursor: pointer; text-align: center; }
  .act-solid { background: var(--brand); color: #fff; }
  .act-solid:hover { background: var(--brand-d); }
  .act-quiet { background: var(--page); color: var(--ink); border-color: var(--rule-2); }
  .act-quiet:hover { border-color: var(--ink-3); }
  .act-full { width: 100%; }
  .act-min { background: none; border: none; padding: 0; min-height: 0; font-size: 12.5px;
             font-weight: 400; color: var(--ink-3); text-decoration: underline; cursor: pointer; }
  .act-row { display: flex; gap: 10px; }
  .act-row > * { flex: 1 1 0; }
  .act-row form { display: flex; margin: 0; }
  .act-row form .act { width: 100%; }
  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 46px;
         padding: 0 18px; border-radius: 3px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn-primary { background: var(--brand); color: #fff; }
  .form-submit { max-width: var(--doc-w); margin: 16px auto 0;
                 padding-left: var(--gutter); padding-right: var(--gutter); }
  .form-submit > .btn { max-width: 620px; margin-left: auto; margin-right: auto; }

  .fine { font-size: 11px; color: var(--ink-3); line-height: 1.55; }

  .dock { position: sticky; bottom: 0; z-index: 20;
          margin-left: calc(var(--gutter) * -1); margin-right: calc(var(--gutter) * -1); margin-top: 18px;
          padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom, 0px));
          background: linear-gradient(180deg, rgba(255,255,255,0), var(--page) 28%); }
  @media (min-width: 900px) { .dock { position: static; margin: 18px 0 0; padding: 0; background: none; } }

  .legal { border-top: 1px solid var(--rule); margin-top: 30px; padding-top: 18px; padding-bottom: 24px;
           font-size: 11.5px; color: var(--ink-3); }
  @media (max-width: 899px) { .legal { padding-bottom: 80px; } }
  .legal-l { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-bottom: 8px; }
  .legal-c { font-size: 11px; line-height: 1.7; color: #A4ABAF; }
`;

const won = (n) => n.toLocaleString() + "원";

const GNAV = ["멤버십", "혜택", "결제", "계정", "고객지원"];

function header(c) {
  return `<div class="util"><div class="shell"><div class="util-in">
      <a href="/primevault?${c.q}">공지사항</a>
      <a href="/primevault?${c.q}">이용안내</a>
      <span class="util-r">
        <a href="/primevault?${c.q}">고객센터 1544-8820</a>
      </span>
    </div></div></div>
    <header class="mast"><div class="shell"><div class="mast-in">
      <a class="mark" href="/primevault?${c.q}">PRIME<b>VAULT</b></a>
      <nav class="gnav">${GNAV.map(
        (l, i) => `<a href="/primevault?${c.q}"${i === 0 ? ' aria-current="page"' : ""}>${l}</a>`
      ).join("")}</nav>
      <span class="mast-r">
        <a href="/primevault?${c.q}">도움말</a>
        <span class="who"><i>${String(c.uid).slice(0, 1).toUpperCase()}</i>${c.uid}</span>
      </span>
    </div></div></header>`;
}

function footer(c, pagePath) {
  const tabs = [
    ["개요", ""],
    ["혜택", ""],
    ["결제", ""],
    ["멤버십", "/cancel/step1"],
  ];
  const my = pagePath.startsWith("/cancel");
  return `<div class="shell"><footer class="legal">
      <div class="legal-l">
        <a href="/primevault?${c.q}">이용약관</a><a href="/primevault?${c.q}">개인정보처리방침</a>
        <a href="/primevault?${c.q}">멤버십 약관</a><a href="/primevault?${c.q}">고객센터</a>
        <a href="/primevault?${c.q}">공지사항</a>
      </div>
      <p class="legal-c">프라임볼트 주식회사 · 대표 서윤재 · 서울특별시 영등포구 여의대로 108 21층<br>
      사업자등록번호 402-86-71155 · 통신판매업 제2020-서울영등포-03391호 · 고객센터 1544-8820<br>
      멤버십 요금은 매월 자동 결제되며, 언제든지 온라인에서 종료할 수 있습니다.</p>
    </footer></div>
    <nav class="dock-nav">${tabs
      .map(
        ([l, h]) =>
          `<a href="/primevault${h}?${c.q}"${(h === "/cancel/step1") === my ? ' aria-current="page"' : ""}>${l}</a>`
      )
      .join("")}</nav>`;
}

module.exports = { THEME, header, footer, won };
