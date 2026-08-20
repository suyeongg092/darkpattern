// ReadWell presentation layer.
//
// The sixth visual language, and the one that has to work hardest: as the
// negative control it must look every bit as designed as the five services that
// carry dark patterns. A plain or austere control would teach a detector that
// "tidy equals honest", which is precisely the shortcut the benchmark exists to
// rule out.
//
// So this is an editorial reading product:
//   - warm paper ground, the only cream in the set;
//   - a serif face for titles and book covers. Nothing else here uses serif, and
//     it is the strongest single differentiator available without webfonts;
//   - the most generous body setting in the set (15px / 1.75) against the
//     marketplace's 13.5 / 1.45, so the reading rhythm is the opposite one;
//   - deep plum as the brand tone. Deliberately not green: a friendly-green
//     control would let a detector separate the honest service by colour alone.
//
// Covers are generated as framed spines — a ruled border and a serif lockup —
// rather than the soft gradient posters StreamNow uses.
//
// Rule carried over: never combine `padding` shorthand with `.shell` on the same
// element, or the shell's horizontal padding silently disappears.

const THEME = `
  :root {
    --paper:  #FAF6EF;
    --sheet:  #FFFFFF;
    --ink:    #241F1A;
    --ink-2:  #5E564C;
    --ink-3:  #948A7C;
    --rule:   #E5DDD0;
    --rule-2: #D3C8B6;
    --plum:   #5A2A44;
    --plum-d: #431E32;
    --tag:    #F0E7D8;
    --doc-w:  1080px;
    --gutter: 20px;
    --serif: "Nanum Myeongjo", "Batang", "바탕", Georgia, "Times New Roman", serif;
  }
  @media (min-width: 900px) { :root { --gutter: 40px; } }

  body {
    background: var(--paper); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
                 "Malgun Gothic", "맑은 고딕", "Segoe UI", sans-serif;
    font-size: 15px; line-height: 1.75;
    padding-bottom: 76px;
  }
  @media (min-width: 900px) { body { padding-bottom: 0; } }
  a { color: inherit; text-decoration: none; }
  h1, h2, h3 { margin: 0; line-height: 1.35; }
  p { margin: 0; }
  .shell { max-width: var(--doc-w); margin: 0 auto; padding-left: var(--gutter); padding-right: var(--gutter); }
  .col { max-width: 640px; margin-left: auto; margin-right: auto; }
  .nums { font-variant-numeric: tabular-nums; }

  /* ── 헤더 ────────────────────────────────────────────── */
  .top { background: var(--paper); border-bottom: 1px solid var(--rule); position: sticky; top: 0; z-index: 40; }
  .top-in { display: flex; align-items: center; gap: 24px; height: 56px; }
  @media (min-width: 900px) { .top-in { height: 66px; } }
  .mark { font-family: var(--serif); font-size: 22px; font-weight: 700; letter-spacing: -.01em;
          color: var(--plum); white-space: nowrap; }
  .nav { display: none; gap: 20px; font-size: 14px; color: var(--ink-2); }
  @media (min-width: 900px) { .nav { display: flex; } }
  .nav a:hover { color: var(--ink); }
  .nav a[aria-current] { color: var(--ink); font-weight: 700; }
  .top-r { margin-left: auto; display: flex; align-items: center; gap: 14px; font-size: 13px; color: var(--ink-2); }
  .who { display: inline-flex; align-items: center; gap: 7px; }
  .who i { width: 26px; height: 26px; border-radius: 50%; background: var(--plum); color: #fff;
           display: grid; place-items: center; font-style: normal; font-size: 11px; font-weight: 700; }
  .backlink { font-size: 13px; color: var(--ink-2); white-space: nowrap; }
  .backlink:hover { color: var(--plum); }

  .tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid;
          grid-template-columns: repeat(4, 1fr); background: var(--sheet);
          border-top: 1px solid var(--rule); padding-bottom: env(safe-area-inset-bottom, 0px); }
  @media (min-width: 900px) { .tabs { display: none; } }
  .tabs a { display: flex; align-items: center; justify-content: center; padding: 13px 0;
            font-size: 12px; color: var(--ink-3); }
  .tabs a[aria-current] { color: var(--plum); font-weight: 700; }

  /* ── 문서 ────────────────────────────────────────────── */
  .doc { padding-top: 24px; padding-bottom: 40px; }

  /* 읽기 제품이라 한 단 구성이다. 서재는 판형 전체를 쓰고, 계정 화면은 본문
     한 줄 길이(620px)로 좁혀 문서처럼 읽히게 한다. 좌우 여백은 .shell 이
     책임지므로 여기서는 폭만 정한다. */
  .narrow { max-width: 620px; margin-left: auto; margin-right: auto; }
  /* 서재 아래 본문 띠. 판형 전체에 dt/dd 를 벌려 놓으면 읽히지 않으므로 두 단으로
     나눠 각 단이 한 줄 길이를 넘지 않게 한다. 폭은 서가와 같은 .shell 을 그대로 쓴다 —
     여기만 좁혀 놓으면 위 블록과 왼쪽 끝은 맞아도 오른쪽이 어긋나 정렬이 깨져 보인다. */
  .pair { display: grid; gap: 0 52px; }
  @media (min-width: 820px) { .pair { grid-template-columns: 1fr 1fr; } }

  /* 이번 달 기록. dt/dd 를 1080px 로 벌리면 이름과 숫자가 화면 양 끝으로 흩어진다. */
  .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px;
           background: var(--rule); border: 1px solid var(--rule); margin: 0; }
  @media (min-width: 700px) { .stats { grid-template-columns: repeat(4, 1fr); } }
  .stats > div { background: var(--paper); padding: 14px 16px; }
  .stats dt { font-size: 12.5px; color: var(--ink-3); }
  .stats dd { margin: 5px 0 0; font-family: var(--serif); font-size: 21px;
              font-variant-numeric: tabular-nums; }

  .kicker { font-size: 12px; letter-spacing: .1em; color: var(--ink-3); margin-bottom: 8px; }
  .title { font-family: var(--serif); font-size: 27px; font-weight: 700; letter-spacing: -.01em; }
  @media (min-width: 900px) { .title { font-size: 34px; } }
  .lede { font-size: 15px; color: var(--ink-2); margin-top: 8px; max-width: 46em; }

  .sec { margin-top: 30px; }
  .sec-h { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px;
           padding-bottom: 8px; border-bottom: 1px solid var(--rule); }
  .sec-h h2 { font-family: var(--serif); font-size: 18px; font-weight: 700; }
  .sec-h span { margin-left: auto; font-size: 12.5px; color: var(--ink-3); }

  /* ── 책 ──────────────────────────────────────────────── */
  .shelf { display: grid; grid-auto-flow: column; grid-auto-columns: 116px; gap: 16px;
           overflow-x: auto; padding-bottom: 6px; }
  @media (min-width: 900px) { .shelf { grid-auto-columns: 142px; gap: 22px; } }
  .bk-cover { position: relative; aspect-ratio: 2/3; border: 1px solid rgba(0,0,0,.16);
              border-radius: 1px 3px 3px 1px; display: grid; place-items: center; padding: 12px 10px;
              overflow: hidden; }
  .bk-cover::before { content: ""; position: absolute; left: 5px; top: 0; bottom: 0; width: 1px;
                      background: rgba(255,255,255,.28); }
  .bk-cover span { font-family: var(--serif); font-size: 14px; font-weight: 700; text-align: center;
                   color: rgba(255,255,255,.96); line-height: 1.3; word-break: keep-all;
                   text-shadow: 0 1px 6px rgba(0,0,0,.3); }
  .bk-t { font-family: var(--serif); font-size: 14px; margin-top: 9px; line-height: 1.35; }
  .bk-a { font-size: 12px; color: var(--ink-3); }
  .bk-bar { height: 3px; background: var(--rule-2); margin-top: 6px; border-radius: 2px; overflow: hidden; }
  .bk-bar i { display: block; height: 100%; background: var(--plum); }

  .rows { border-top: 1px solid var(--rule); }
  .rows > * { display: flex; align-items: center; gap: 14px; justify-content: space-between;
              padding: 14px 0; border-bottom: 1px solid var(--rule); min-height: 56px; }
  .rows a:hover { color: var(--plum); }
  .rows form { margin: 0; }
  .rows form .act-txt { text-align: left; }
  .rows .chev { color: var(--ink-3); }
  .rows .val { margin-left: auto; color: var(--ink-2); font-size: 13.5px; }

  .kv { display: flex; justify-content: space-between; gap: 14px; padding: 9px 0; font-size: 14px; }
  .kv + .kv { border-top: 1px solid var(--rule); }
  .kv dt { color: var(--ink-2); }
  .kv dd { margin: 0; font-variant-numeric: tabular-nums; }

  .tag { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 2px 8px;
         border-radius: 2px; background: var(--tag); color: var(--ink-2); }
  .tag-on { background: #EADCE4; color: var(--plum); }

  /* 홍보 요소 — 설득적이되 투명하게 */
  .promo { border: 1px solid var(--rule-2); background: var(--sheet); border-radius: 3px;
           padding: 18px 20px; margin-top: 24px; }
  /* 제안도 서가와 같은 폭을 쓰되, 글과 숫자를 두 단으로 나눠 줄이 늘어지지 않게 한다. */
  .promo-r { margin-top: 16px; }
  @media (min-width: 820px) {
    .promo { display: grid; grid-template-columns: 1fr 1fr; gap: 0 44px;
             align-items: start; padding: 22px 24px; }
    .promo-r { margin-top: 0; }
  }
  .promo-h { font-family: var(--serif); font-size: 17px; font-weight: 700; }
  .promo-p { font-size: 14px; color: var(--ink-2); margin-top: 4px; }
  .promo-terms { font-size: 12.5px; color: var(--ink-2); margin-top: 12px; padding-top: 12px;
                 border-top: 1px dashed var(--rule-2); }

  .note { border-left: 3px solid var(--plum); background: var(--sheet); border-radius: 0 3px 3px 0;
          padding: 14px 16px; font-size: 14px; margin-top: 16px; }
  .note b { display: block; font-size: 13px; color: var(--ink-2); margin-bottom: 4px; }
  .fine { font-size: 12.5px; color: var(--ink-3); line-height: 1.6; }

  /* ── 동작 ────────────────────────────────────────────── */
  .act { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
         min-height: 48px; padding: 0 20px; border-radius: 2px; border: 1px solid transparent;
         font-size: 15px; font-weight: 600; cursor: pointer; text-align: center; }
  .act-solid { background: var(--plum); color: #fff; }
  .act-solid:hover { background: var(--plum-d); }
  .act-quiet { background: var(--sheet); color: var(--ink); border-color: var(--rule-2); }
  .act-quiet:hover { border-color: var(--ink-3); }
  .act-full { width: 100%; }
  .act-row { display: flex; gap: 10px; }
  .act-row > * { flex: 1 1 0; }
  .act-row form { display: flex; margin: 0; }
  .act-row form .act { width: 100%; }
  .act-txt { background: none; border: none; padding: 0; min-height: 0; font-size: 13.5px;
             font-weight: 400; color: var(--ink-2); text-decoration: underline; cursor: pointer; }
  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 48px;
         padding: 0 20px; border-radius: 2px; border: none; font-size: 15px; font-weight: 600; cursor: pointer; }
  .btn-primary { background: var(--plum); color: #fff; }
  .form-submit { max-width: var(--doc-w); margin: 18px auto 0;
                 padding-left: var(--gutter); padding-right: var(--gutter); }
  .form-submit > .btn { max-width: 640px; margin-left: auto; margin-right: auto; }

  .chk { display: flex; gap: 11px; align-items: flex-start; padding: 12px 0; font-size: 14px;
         border-top: 1px solid var(--rule); cursor: pointer; }
  .chk:first-child { border-top: none; }
  .chk input { margin: 3px 0 0; accent-color: var(--plum); width: 17px; height: 17px; flex: none; }

  .legal { border-top: 1px solid var(--rule); margin-top: 40px; padding-top: 22px; padding-bottom: 28px;
           font-size: 12.5px; color: var(--ink-3); }
  @media (max-width: 899px) { .legal { padding-bottom: 88px; } }
  .legal-l { display: flex; flex-wrap: wrap; gap: 7px 18px; margin-bottom: 10px; }
  .legal-c { font-size: 12px; line-height: 1.75; color: #A79C8C; }
`;

const won = (n) => n.toLocaleString() + "원";

const spine = (hue) =>
  `background: linear-gradient(118deg, hsl(${hue} 34% 42%), hsl(${(hue + 18) % 360} 30% 30%))`;

function bookTile(b, c) {
  return `<a href="/readwell?${c.q}">
    <span class="bk-cover" style="${spine(b.hue)}"><span>${b.title}</span></span>
    <span class="bk-t" style="display:block">${b.title}</span>
    <span class="bk-a" style="display:block">${b.author}</span>
    ${b.progress ? `<span class="bk-bar"><i style="width:${Math.round(b.progress * 100)}%"></i></span>` : ""}
  </a>`;
}

const NAV = ["둘러보기", "내 서재", "오디오북", "구독"];

// 서비스 안쪽 화면에서는 탐색 링크 대신 되돌아가는 링크를 준다. 어디로 돌아가는지는
// service.js 가 흐름의 이전 단계를 계산해 넘겨준다.
function header(c, back, pagePath) {
  const inside = pagePath !== "/";
  return `<header class="top"><div class="shell"><div class="top-in">
      <a class="mark" href="/readwell?${c.q}">ReadWell</a>
      ${
        inside
          ? `<a class="backlink" href="${back.href}">&larr; ${back.label}</a>`
          : `<nav class="nav">${NAV.map(
              (l, i) => `<a href="/readwell?${c.q}"${i === 0 ? ' aria-current="page"' : ""}>${l}</a>`
            ).join("")}</nav>`
      }
      <span class="top-r">
        <a href="/readwell?${c.q}">고객센터</a>
        <span class="who"><i>${String(c.uid).slice(0, 1).toUpperCase()}</i>${c.uid}</span>
      </span>
    </div></div></header>`;
}

function footer(c, pagePath) {
  const tabs = [["둘러보기", ""], ["내 서재", ""], ["오디오북", ""], ["구독", "/manage"]];
  // 활성 탭은 하나뿐이다. 홈이면 '둘러보기', 그 밖의 화면은 전부 계정 영역이라
  // '구독'. 이전에는 경로 비교식이 홈에서 "" 짜리 탭 세 개를 동시에 활성으로 찍었다.
  const current = pagePath === "/" ? "둘러보기" : "구독";
  return `<div class="shell"><footer class="legal">
      <div class="legal-l">
        <a href="/readwell?${c.q}">이용약관</a><a href="/readwell?${c.q}">개인정보처리방침</a>
        <a href="/readwell?${c.q}">저작권 정책</a><a href="/readwell?${c.q}">고객센터</a>
        <a href="/readwell?${c.q}">출판사 문의</a>
      </div>
      <p class="legal-c">리드웰 주식회사 · 대표 오세린 · 서울특별시 마포구 양화로 45 8층<br>
      사업자등록번호 211-88-40276 · 통신판매업 제2022-서울마포-05517호 · 고객센터 1670-9040<br>
      구독은 매월 자동 갱신되며, 마이페이지에서 언제든 해지할 수 있습니다. 해지 시 잔여 기간은 일할 환불됩니다.</p>
    </footer></div>
    <nav class="tabs">${tabs
      .map(([l, h]) => `<a href="/readwell${h}?${c.q}"${l === current ? ' aria-current="page"' : ""}>${l}</a>`)
      .join("")}</nav>`;
}

module.exports = { THEME, header, footer, bookTile, spine, won };
