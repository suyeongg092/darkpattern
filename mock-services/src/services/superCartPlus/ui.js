// SuperCart Plus presentation layer.
//
// A mature marketplace, so the design brief is density rather than calm: search
// owns the header, a category taxonomy sits under it, and product rows carry
// price, shipping, seller, rating, review count and an arrival date all at once.
// StreamNow is dark and spacious, OrderNow is light and list-led; this one is
// light, busy and grid-led, with a second (blue) colour reserved for delivery
// and links so the brand red stays on price and promotion.
//
// Rule learned the hard way: never combine `padding` shorthand with `.shell` on
// the same element — the later declaration silently drops the shell's horizontal
// padding and the page runs to the screen edge.

const { CATEGORIES } = require("./data");

const THEME = `
  :root {
    --ink:     #202329;
    --ink-2:   #5B616E;
    --ink-3:   #949AA6;
    --line:    #E6E8EC;
    --line-2:  #D5D8DE;
    --ground:  #F6F7F9;
    --card:    #FFFFFF;
    --brand:   #E2493C;
    --brand-d: #C43A2E;
    --info:    #1F6FEB;
    --ok:      #148A5B;
    --shell-w: 1240px;
    --form-w:  640px;
    --gutter:  14px;
  }
  @media (min-width: 900px) { :root { --gutter: 24px; } }

  body {
    background: var(--ground); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
                 "Malgun Gothic", "맑은 고딕", "Segoe UI", sans-serif;
    font-size: 13.5px; line-height: 1.45;
    padding-bottom: 76px;
  }
  @media (min-width: 900px) { body { padding-bottom: 0; } }
  a { color: inherit; text-decoration: none; }
  h1, h2, h3 { margin: 0; line-height: 1.3; letter-spacing: -.01em; }
  p { margin: 0; }
  .shell { max-width: var(--shell-w); margin: 0 auto; padding-left: var(--gutter); padding-right: var(--gutter); }
  .col { max-width: 620px; margin-left: auto; margin-right: auto; }

  /* ── 헤더: 검색이 지배한다 ────────────────────────────── */
  .top { background: var(--card); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 40; }
  .top-a { display: flex; align-items: center; gap: 10px; height: 52px; }
  @media (min-width: 900px) { .top-a { height: 62px; gap: 20px; } }
  .logo { font-size: 17px; font-weight: 800; color: var(--brand); letter-spacing: -.04em; white-space: nowrap; }
  .logo b { font-weight: 800; color: var(--ink); }
  .sbox { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 8px; height: 36px;
          padding: 0 12px; background: var(--ground); border: 1.5px solid var(--brand); border-radius: 6px;
          color: var(--ink-3); font-size: 13px; }
  @media (min-width: 900px) { .sbox { height: 40px; max-width: 560px; } }
  .top-r { margin-left: auto; display: flex; align-items: center; gap: 13px; font-size: 12.5px; color: var(--ink-2); }
  .cart { position: relative; font-size: 17px; }
  .cart b { position: absolute; top: -5px; right: -8px; background: var(--brand); color: #fff;
            font-size: 9.5px; font-weight: 700; border-radius: 999px; padding: 1px 4px; }
  .cats { display: flex; gap: 14px; overflow-x: auto; padding: 7px 0 9px; font-size: 13px;
          color: var(--ink-2); scrollbar-width: none; border-bottom: 1px solid var(--line); }
  .cats::-webkit-scrollbar { display: none; }
  .cats a { flex: none; white-space: nowrap; }
  .cats a[aria-current] { color: var(--ink); font-weight: 700; }

  .tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid;
          grid-template-columns: repeat(5, 1fr); background: var(--card);
          border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom, 0px); }
  @media (min-width: 900px) { .tabs { display: none; } }
  .tabs a { display: flex; flex-direction: column; align-items: center; gap: 2px;
            padding: 8px 0 7px; font-size: 10px; color: var(--ink-3); }
  .tabs a[aria-current] { color: var(--brand); font-weight: 700; }
  .tabs b { font-size: 15px; font-weight: 400; line-height: 1; }

  /* ── 상품 그리드 ─────────────────────────────────────── */
  .sec { padding-top: 14px; padding-bottom: 4px; }
  .sec-h { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
  .sec-h h2 { font-size: 16px; font-weight: 800; }
  .sec-h span { margin-left: auto; font-size: 12px; color: var(--ink-3); }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (min-width: 700px) { .grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1000px) { .grid { grid-template-columns: repeat(5, 1fr); gap: 14px; } }
  .pcard { background: var(--card); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  .pcard:hover { border-color: var(--line-2); }
  .pimg { aspect-ratio: 1/1; position: relative; }
  .pimg::after { content: ""; position: absolute; inset: 0;
                 background: radial-gradient(58% 50% at 34% 26%, rgba(255,255,255,.45), transparent 68%); }
  .pbody { padding: 9px 10px 11px; }
  .pname { font-size: 12.5px; line-height: 1.35; height: 2.7em; overflow: hidden; }
  .pprice { font-size: 15px; font-weight: 800; margin-top: 5px; font-variant-numeric: tabular-nums; }
  .pmeta { font-size: 11px; color: var(--ink-3); margin-top: 2px; }
  /* 광고 표기. 시정 전에는 10px 회색 대문자 AD 로 카드 구석에 묻고, 시정 후에는
     상품명 위에 놓인 읽히는 '광고' 칩이 된다. 같은 정보가 얼마나 다르게 전달되는지가
     위장 광고의 핵심이라 두 표기를 같은 파일에 나란히 둔다. */
  .adfaint { font-size: 9px; color: #C9CDD2; letter-spacing: .04em; }
  .adchip { display: inline-block; font-size: 10.5px; font-weight: 800; padding: 1px 6px;
            border-radius: 3px; background: #EEF1F4; color: #4E5968; margin-bottom: 4px; }
  .adnote { font-size: 11px; color: var(--ink-3); margin-top: 6px; }
  .soldout { position: absolute; inset: 0; display: grid; place-items: center;
             background: rgba(255,255,255,.72); font-size: 12.5px; font-weight: 800; color: var(--ink-2); }

  .ptag { display: inline-block; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px;
          background: #FFF0EE; color: var(--brand); margin-top: 4px; }
  .ptag-x { background: #EEF4FF; color: var(--info); }

  /* ── 상품 상세: 갤러리 + 구매 패널 ───────────────────── */
  .pdp { display: block; padding-top: 14px; }
  @media (min-width: 900px) {
    .pdp { display: grid; grid-template-columns: minmax(0,1fr) 372px; gap: 32px; align-items: start; }
  }
  .gal { background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .gal-main { aspect-ratio: 1/1; position: relative; }
  .gal-main::after { content: ""; position: absolute; inset: 0;
                     background: radial-gradient(52% 46% at 36% 28%, rgba(255,255,255,.5), transparent 66%); }
  .gal-thumbs { display: flex; gap: 6px; padding: 8px; }
  .gal-thumbs i { width: 44px; height: 44px; border-radius: 4px; display: block; border: 1px solid var(--line); }
  .buy { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; margin-top: 12px; }
  @media (min-width: 900px) { .buy { margin-top: 0; position: sticky; top: 78px; } }
  .brand-l { font-size: 12px; color: var(--info); font-weight: 700; }
  .pdp-h { font-size: 16px; font-weight: 700; margin: 4px 0 6px; line-height: 1.4; }
  @media (min-width: 900px) { .pdp-h { font-size: 18px; } }
  .stars { font-size: 12px; color: var(--ink-2); }
  .stars b { color: var(--ink); }

  .seller { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px;
            padding: 10px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
            margin: 12px 0; color: var(--ink-2); }
  .arrive { font-size: 12.5px; color: var(--info); font-weight: 700; }

  .opt-sel { width: 100%; height: 40px; padding: 0 10px; border: 1px solid var(--line-2);
             border-radius: 6px; background: var(--card); font-size: 13px; margin-top: 8px; }

  /* ── 카드/표 ─────────────────────────────────────────── */
  .box { background: var(--card); border: 1px solid var(--line); border-radius: 10px; }
  .box + .box { margin-top: 12px; }
  .pad { padding: 15px; }
  @media (min-width: 900px) { .pad { padding: 19px; } }
  .box-h { font-size: 13.5px; font-weight: 800; margin-bottom: 11px; }
  .kv { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; font-size: 13px; }
  .kv + .kv { border-top: 1px solid var(--line); }
  .kv dt { color: var(--ink-2); }
  .kv dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 600; }
  .kv-tot { border-top: 2px solid var(--ink) !important; padding-top: 10px; font-size: 15px; font-weight: 800; }

  .rows > * { display: flex; align-items: center; gap: 10px; justify-content: space-between;
              padding: 13px 15px; border-top: 1px solid var(--line); min-height: 50px; font-size: 13.5px; }
  @media (min-width: 900px) { .rows > * { padding: 13px 19px; } }
  .rows > *:first-child { border-top: none; }
  .rows a:hover { background: #FAFBFC; }
  .rows .chev { color: var(--ink-3); }
  .rows .val { margin-left: auto; color: var(--ink-2); font-size: 12.5px; }

  .rev { padding: 11px 0; border-top: 1px solid var(--line); font-size: 12.5px; }
  .rev:first-child { border-top: none; }
  .rev-h { display: flex; gap: 8px; color: var(--ink-3); font-size: 11.5px; margin-bottom: 3px; }
  .rev-h b { color: var(--brand); }

  /* ── 계정 ────────────────────────────────────────────── */
  .acct { padding-top: 14px; padding-bottom: 30px; }
  /* 계정 화면의 본문 폭. 폼 본문과 셸이 넣어주는 제출 버튼이 반드시 같은 값을 써야
     한다 — 예전에는 본문이 520px 왼쪽 정렬이고 버튼만 620px 가운데 정렬이라 두
     블록의 좌우 끝이 모두 어긋났다. */
  .ag { display: block; }
  .fw { max-width: var(--form-w); }
  @media (min-width: 900px) {
    .ag { display: grid; grid-template-columns: 200px minmax(0, var(--form-w)); gap: 30px; align-items: start; }
    .side { position: sticky; top: 78px; }
  }
  .side { display: none; }
  @media (min-width: 900px) { .side { display: block; } }
  .side-h { font-size: 11.5px; color: var(--ink-3); font-weight: 700; margin-bottom: 8px; }
  .h1 { font-size: 19px; font-weight: 800; margin-bottom: 4px; }
  @media (min-width: 900px) { .h1 { font-size: 23px; } }
  .sub { font-size: 12.5px; color: var(--ink-2); margin-bottom: 13px; }
  .crumb { font-size: 11.5px; color: var(--ink-3); padding-top: 10px; padding-bottom: 6px; }

  /* ── 버튼 ────────────────────────────────────────────── */
  .b { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
       min-height: 46px; padding: 0 16px; border-radius: 6px; border: 1px solid transparent;
       font-size: 14.5px; font-weight: 700; cursor: pointer; text-align: center; }
  .b-fill { background: var(--brand); color: #fff; }
  .b-fill:hover { background: var(--brand-d); }
  .b-line { background: var(--card); color: var(--ink); border-color: var(--line-2); }
  .b-line:hover { border-color: var(--ink-3); }
  .b-wide { width: 100%; }
  .b-mute { background: none; border: none; padding: 0; min-height: 0; font-size: 12px;
            font-weight: 400; color: var(--ink-3); text-decoration: underline; cursor: pointer; }
  .brow { display: flex; gap: 9px; }
  .brow > * { flex: 1 1 0; }
  .brow form { display: flex; margin: 0; }
  .brow form .b { width: 100%; }
  /* 제출 버튼은 .ag 의 두 번째 칸에 정확히 겹쳐 놓는다. 같은 격자·같은 폭이라야
     위의 폼 본문과 좌우 끝이 맞는다. */
  .form-submit { max-width: var(--shell-w); margin: 14px auto 0;
                 padding-left: var(--gutter); padding-right: var(--gutter); }
  .form-submit > .btn { max-width: var(--form-w); margin-left: 0; margin-right: 0; }
  @media (min-width: 900px) {
    .form-submit { display: grid; grid-template-columns: 200px minmax(0, var(--form-w)); gap: 30px; }
    .form-submit > .btn { grid-column: 2; max-width: none; }
  }
  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 46px;
         padding: 0 16px; border-radius: 6px; border: none; font-size: 14.5px; font-weight: 700; cursor: pointer; }
  .btn-primary { background: var(--brand); color: #fff; }
  .btn-primary:hover { background: var(--brand-d); }

  /* ── 폼 ──────────────────────────────────────────────── */
  .opt { display: flex; gap: 10px; align-items: flex-start; padding: 13px 14px; background: var(--card);
         border: 1px solid var(--line-2); border-radius: 7px; cursor: pointer; font-size: 13.5px; }
  .opt + .opt { margin-top: 7px; }
  .opt:hover { border-color: var(--ink-3); }
  .opt input { margin: 1px 0 0; accent-color: var(--brand); width: 17px; height: 17px; flex: none; }
  .opt-b { display: block; font-weight: 700; }
  .opt-d { display: block; font-size: 12px; color: var(--ink-2); margin-top: 2px; }
  .opt-n { display: block; font-size: 11.5px; color: var(--brand); margin-top: 3px; font-weight: 700; }
  .field { width: 100%; height: 44px; padding: 0 12px; border: 1px solid var(--line-2);
           border-radius: 6px; background: var(--card); font-variant-numeric: tabular-nums;
           letter-spacing: .18em; }

  .note { background: #FFF9F8; border: 1px solid #F5D6D2; border-left: 3px solid var(--brand);
          border-radius: 7px; padding: 12px 14px; font-size: 13px; }
  .note b { display: block; font-size: 12px; color: var(--ink-2); margin-bottom: 3px; }
  .fine { font-size: 10px; color: #C3C7CE; line-height: 1.5; }

  .strip { display: flex; align-items: center; justify-content: center; gap: 8px;
           background: #FFF3F1; border: 1px solid #F6CFC9; border-radius: 7px;
           padding: 9px 13px; font-size: 12.5px; font-weight: 700; color: var(--brand-d); }
  .gauge { height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; margin: 6px 0 7px; }
  .gauge i { display: block; height: 100%; background: var(--brand); }

  .sticky { position: sticky; bottom: 0; z-index: 20;
            margin-left: calc(var(--gutter) * -1); margin-right: calc(var(--gutter) * -1); margin-top: 14px;
            padding: 11px var(--gutter) calc(11px + env(safe-area-inset-bottom, 0px));
            background: linear-gradient(180deg, rgba(246,247,249,0), var(--ground) 30%); }
  @media (min-width: 900px) { .sticky { position: static; margin: 14px 0 0; padding: 0; background: none; } }

  .foot { border-top: 1px solid var(--line); margin-top: 28px; padding-top: 20px; padding-bottom: 26px;
          font-size: 11.5px; color: var(--ink-3); background: var(--card); }
  @media (max-width: 899px) { .foot { padding-bottom: 88px; } }
  .foot-l { display: flex; flex-wrap: wrap; gap: 6px 15px; margin-bottom: 9px; }
  .foot-c { font-size: 11px; line-height: 1.7; color: #B4B9C2; }
`;

const swatch = (hue, l = 78) =>
  `background: linear-gradient(152deg, hsl(${hue} 34% ${l}%), hsl(${(hue + 24) % 360} 28% ${l - 14}%))`;

const won = (n) => n.toLocaleString() + "원";

// opts.ad: "faint" 면 카드 구석의 9px AD, "chip" 이면 상품명 위의 '광고' 칩.
// opts.soldOut: 이미지 위에 품절 딱지.
function pcard(p, c, opts = {}) {
  return `<a class="pcard" href="/supercart-plus/item/${p.id}?${c.q}">
    <span class="pimg" style="${swatch(p.hue)}">${
      opts.soldOut ? `<span class="soldout">품절</span>` : ""
    }</span>
    <span class="pbody" style="display:block">
      ${opts.ad === "chip" ? `<span class="adchip">광고</span>` : ""}
      <span class="pname" style="display:block">${p.name}</span>
      <span class="pprice" style="display:block">${won(p.price)}</span>
      <span class="pmeta" style="display:block">★ ${p.rating} (${p.reviews.toLocaleString()}) · ${
    p.ship === 0 ? "무료배송" : "배송비 " + won(p.ship)
  }</span>
      <span class="ptag ${p.tag === "해외직구" ? "ptag-x" : ""}">${p.tag}</span>${
        opts.ad === "faint" ? `<span class="adfaint"> AD</span>` : ""
      }
      ${opts.ad === "chip" && p.sponsor ? `<span class="adnote" style="display:block">${p.sponsor}가 비용을 지불한 광고입니다</span>` : ""}
    </span>
  </a>`;
}

function header(c) {
  return `<header class="top"><div class="shell">
      <div class="top-a">
        <a class="logo" href="/supercart-plus?${c.q}">Super<b>Cart</b></a>
        <a class="sbox" href="/supercart-plus?${c.q}">🔎 찾으시는 상품을 검색해보세요</a>
        <div class="top-r">
          <a href="/supercart-plus/cancel/hub?${c.q}">마이페이지</a>
          <a class="cart" href="/supercart-plus/checkout?${c.q}">🛒<b>1</b></a>
        </div>
      </div>
      <nav class="cats">${CATEGORIES.map(
        (k, i) => `<a href="/supercart-plus?${c.q}"${i === 0 ? ' aria-current="page"' : ""}>${k}</a>`
      ).join("")}</nav>
    </div></header>`;
}

function footer(c, pagePath) {
  const tabs = [
    ["홈", "▤", ""],
    ["카테고리", "☰", ""],
    ["검색", "🔎", ""],
    ["장바구니", "🛒", "/checkout"],
    ["마이", "👤", "/cancel/hub"],
  ];
  const my = pagePath.startsWith("/cancel");
  return `<footer class="foot"><div class="shell">
      <div class="foot-l">
        <a href="/supercart-plus?${c.q}">이용약관</a><a href="/supercart-plus?${c.q}">개인정보처리방침</a>
        <a href="/supercart-plus?${c.q}">고객센터</a><a href="/supercart-plus?${c.q}">판매자 지원</a>
        <a href="/supercart-plus?${c.q}">공지사항</a>
      </div>
      <p class="foot-c">슈퍼카트 주식회사 · 대표 배기훈 · 서울특별시 강남구 테헤란로 501<br>
      사업자등록번호 305-87-11924 · 통신판매업 제2022-서울강남-08813호 · 고객센터 1577-4020<br>
      일부 상품은 슈퍼카트가 통신판매중개자로서 거래 당사자가 아니며, 해당 상품의 거래 책임은 판매자에게 있습니다.</p>
    </div></footer>
    <nav class="tabs">${tabs
      .map(
        ([l, i, h]) =>
          `<a href="/supercart-plus${h}?${c.q}"${(h === "/cancel/hub") === my ? ' aria-current="page"' : ""}><b>${i}</b>${l}</a>`
      )
      .join("")}</nav>`;
}

module.exports = { THEME, header, footer, pcard, swatch, won };
