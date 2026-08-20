// OrderNow Club presentation layer.
//
// Deliberately the opposite of StreamNow: light ground, dense rows, two accent
// colours, tight leading. A delivery app is photo-led and list-heavy, and its
// identity starts with the delivery address at the top of the screen — not with
// a membership card. Membership is one row inside the account area, the way it
// is in the products this is drawn from.
//
// Food imagery is generated per restaurant from its own hue rather than shipped
// as files: twelve photographs would add megabytes to a fixture repository, and
// generated plates keep each listing visually distinct.

const { CATEGORIES, ADDRESS } = require("./data");

const THEME = `
  :root {
    --ink:      #17181C;
    --ink-2:    #5C6270;
    --ink-3:    #9AA0AC;
    --line:     #E9EBEF;
    --line-2:   #DCDFE5;
    --ground:   #F4F5F7;
    --card:     #FFFFFF;
    --mint:     #2AC1BC;
    --mint-d:   #1EA6A1;
    --coral:    #FF5A3C;
    --shell-w:  1180px;
    --gutter:   16px;
  }
  @media (min-width: 900px) { :root { --gutter: 28px; } }

  body {
    background: var(--ground);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
                 "Malgun Gothic", "맑은 고딕", "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.45;
    padding-bottom: 78px;
  }
  @media (min-width: 900px) { body { padding-bottom: 0; } }
  a { color: inherit; text-decoration: none; }
  h1, h2, h3 { margin: 0; line-height: 1.3; letter-spacing: -.01em; }
  p { margin: 0; }

  .shell { max-width: var(--shell-w); margin: 0 auto; padding: 0 var(--gutter); }
  .col { max-width: 620px; margin-left: auto; margin-right: auto; }

  /* ── 헤더: 배달 주소가 제품의 첫 줄이다 ─────────────────── */
  .top { background: var(--card); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 40; }
  .top-a { display: flex; align-items: center; gap: 10px; height: 50px; }
  .logo { font-size: 17px; font-weight: 800; color: var(--mint); letter-spacing: -.03em; white-space: nowrap; }
  .addr { display: flex; align-items: center; gap: 5px; font-size: 13.5px; font-weight: 700;
          min-width: 0; }
  .addr span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .addr i { font-style: normal; color: var(--ink-3); font-size: 11px; }
  .top-r { margin-left: auto; display: flex; align-items: center; gap: 14px; font-size: 13px; color: var(--ink-2); }
  .cart { position: relative; font-size: 17px; }
  .cart b { position: absolute; top: -4px; right: -7px; background: var(--coral); color: #fff;
            font-size: 9.5px; font-weight: 700; border-radius: 999px; padding: 1px 4px; }
  .search { display: none; flex: 1 1 auto; max-width: 380px; height: 36px; align-items: center; gap: 8px;
            padding: 0 12px; background: var(--ground); border-radius: 8px; color: var(--ink-3); font-size: 13px; }
  @media (min-width: 900px) { .search { display: flex; } .top-a { height: 60px; gap: 18px; } }
  .search-m { display: flex; align-items: center; gap: 8px; height: 38px; margin: 10px 0 2px;
              padding: 0 12px; background: var(--ground); border-radius: 8px; color: var(--ink-3); font-size: 13px; }
  @media (min-width: 900px) { .search-m { display: none; } }

  .cats { display: flex; gap: 6px; overflow-x: auto; padding: 8px 0 10px; scrollbar-width: none; }
  .cats::-webkit-scrollbar { display: none; }
  .cats a { flex: none; padding: 6px 12px; border-radius: 999px; font-size: 13px;
            background: var(--ground); color: var(--ink-2); border: 1px solid transparent; }
  @media (min-width: 900px) { .cats a { background: transparent; } }
  .cats a[aria-current] { background: var(--ink); color: #fff; font-weight: 700; }

  /* ── 하단 탭 ─────────────────────────────────────────── */
  .tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: grid;
          grid-template-columns: repeat(5, 1fr); background: var(--card);
          border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom, 0px); }
  @media (min-width: 900px) { .tabs { display: none; } }
  .tabs a { display: flex; flex-direction: column; align-items: center; gap: 2px;
            padding: 8px 0 7px; font-size: 10px; color: var(--ink-3); }
  .tabs a[aria-current] { color: var(--mint); font-weight: 700; }
  .tabs b { font-size: 16px; font-weight: 400; line-height: 1; }

  /* ── 음식점 목록 ─────────────────────────────────────── */
  .sec { padding: 14px 0 6px; }
  .sec-h { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
  .sec-h h2 { font-size: 16px; font-weight: 800; }
  .sec-h span { font-size: 12px; color: var(--ink-3); margin-left: auto; }

  .biz { display: grid; grid-template-columns: 1fr; gap: 0; background: var(--card);
         border-radius: 12px; overflow: hidden; border: 1px solid var(--line); }
  @media (min-width: 700px) { .biz { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1000px) { .biz { grid-template-columns: repeat(3, 1fr); } }
  .biz > a { display: flex; gap: 11px; padding: 11px 13px; border-bottom: 1px solid var(--line);
             align-items: center; min-height: 76px; }
  .biz > a:hover { background: #FAFBFC; }
  .thumb { width: 60px; height: 60px; border-radius: 8px; flex: none; position: relative; overflow: hidden; }
  .thumb::after { content: ""; position: absolute; inset: 0;
                  background: radial-gradient(60% 55% at 32% 30%, rgba(255,255,255,.42), transparent 70%); }
  .biz-b { min-width: 0; flex: 1 1 auto; display: block; }
  .biz-n, .biz-m, .biz-f { display: block; }
  .biz-n { font-size: 14.5px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .biz-m { font-size: 12px; color: var(--ink-2); margin-top: 2px; font-variant-numeric: tabular-nums; }
  .biz-m b { color: var(--ink); font-weight: 700; }
  .biz-f { font-size: 11.5px; color: var(--ink-3); margin-top: 1px; }
  .flag { display: inline-block; font-size: 10.5px; font-weight: 700; padding: 1px 5px;
          border-radius: 4px; margin-left: 4px; vertical-align: 1px; }
  .flag-c { background: #FFEDE9; color: var(--coral); }
  .flag-m { background: #E2F7F6; color: var(--mint-d); }
  .free { color: var(--mint-d); font-weight: 700; }

  /* ── 카드/패널 ───────────────────────────────────────── */
  .box { background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
  .box + .box { margin-top: 12px; }
  .pad { padding: 16px; }
  @media (min-width: 900px) { .pad { padding: 20px; } }
  .box-h { font-size: 14px; font-weight: 800; margin-bottom: 12px; }

  .rows > * { display: flex; align-items: center; gap: 10px; justify-content: space-between;
              padding: 14px 16px; border-top: 1px solid var(--line); min-height: 52px; font-size: 14px; }
  @media (min-width: 900px) { .rows > * { padding: 14px 20px; } }
  .rows > *:first-child { border-top: none; }
  .rows a:hover { background: #FAFBFC; }
  .rows .chev { color: var(--ink-3); font-size: 15px; }
  .rows .val { margin-left: auto; color: var(--ink-2); font-size: 13px; }

  .kv { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; font-size: 13.5px; }
  .kv + .kv { border-top: 1px solid var(--line); }
  .kv dt { color: var(--ink-2); }
  .kv dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 600; }

  /* ── 쿠폰 ────────────────────────────────────────────── */
  .cpn { display: flex; gap: 11px; align-items: center; padding: 12px 0; border-top: 1px dashed var(--line-2); }
  .cpn:first-child { border-top: none; }
  .cpn-i { width: 38px; height: 38px; border-radius: 6px; background: var(--ground);
           display: grid; place-items: center; font-size: 18px; flex: none; }
  .cpn > span:nth-child(2) { flex: 1 1 auto; min-width: 0; }
  .cpn-n { display: block; font-size: 13.5px; font-weight: 700; }
  .cpn-s { display: block; font-size: 11.5px; color: var(--ink-3); margin-top: 1px; }
  .cpn-e { margin-left: auto; font-size: 11.5px; color: var(--ink-3); white-space: nowrap; }

  /* ── 계정 ────────────────────────────────────────────── */
  .acct { padding-top: 16px; padding-bottom: 32px; }
  .grid { display: block; }
  @media (min-width: 900px) {
    .grid { display: grid; grid-template-columns: 208px minmax(0,1fr); gap: 32px; align-items: start; }
    .side { position: sticky; top: 76px; }
  }
  .side { display: none; }
  @media (min-width: 900px) { .side { display: block; } }
  .side-h { font-size: 11.5px; color: var(--ink-3); margin-bottom: 8px; font-weight: 700; }
  .h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
  @media (min-width: 900px) { .h1 { font-size: 24px; } }
  .sub { font-size: 13px; color: var(--ink-2); margin-bottom: 14px; }
  .crumb { font-size: 12px; color: var(--ink-3); padding: 10px 0 6px; }
  .crumb a:hover { color: var(--ink-2); }

  /* ── 버튼 ────────────────────────────────────────────── */
  .b { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
       min-height: 46px; padding: 0 18px; border-radius: 8px; border: 1px solid transparent;
       font-size: 15px; font-weight: 700; cursor: pointer; text-align: center; }
  .b-fill { background: var(--mint); color: #fff; }
  .b-fill:hover { background: var(--mint-d); }
  .b-line { background: var(--card); color: var(--ink); border-color: var(--line-2); }
  .b-line:hover { border-color: var(--ink-3); }
  .b-wide { width: 100%; }
  .b-txt { background: none; border: none; padding: 0; min-height: 0; font-size: 13px;
           font-weight: 400; color: var(--ink-2); text-decoration: underline; cursor: pointer; }
  .b-mute { background: none; border: none; padding: 0; min-height: 0; font-size: 12px;
            font-weight: 400; color: var(--ink-3); text-decoration: underline; cursor: pointer; }
  .brow { display: flex; gap: 9px; }
  .brow > * { flex: 1 1 0; }
  .brow form { display: flex; margin: 0; }
  .brow form .b { width: 100%; }

  /* 셸이 주입하는 제출 버튼 */
  .form-submit { max-width: var(--shell-w); margin: 14px auto 0;
                 padding-left: var(--gutter); padding-right: var(--gutter); }
  .form-submit > .btn { max-width: 620px; margin-left: auto; margin-right: auto; }
  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 46px;
         padding: 0 18px; border-radius: 8px; border: none; font-size: 15px; font-weight: 700; cursor: pointer; }
  .btn-primary { background: var(--mint); color: #fff; }
  .btn-primary:hover { background: var(--mint-d); }

  /* ── 폼 ──────────────────────────────────────────────── */
  .opt { display: flex; gap: 10px; align-items: flex-start; padding: 13px 14px; background: var(--card);
         border: 1px solid var(--line-2); border-radius: 8px; cursor: pointer; font-size: 14px; }
  .opt + .opt { margin-top: 7px; }
  .opt:hover { border-color: var(--ink-3); }
  .opt input { margin: 1px 0 0; accent-color: var(--mint); width: 17px; height: 17px; flex: none; }

  .note { background: #F7FCFC; border: 1px solid #CFEDEC; border-left: 3px solid var(--mint);
          border-radius: 8px; padding: 12px 14px; font-size: 13.5px; }
  .note b { display: block; font-size: 12.5px; color: var(--ink-2); margin-bottom: 3px; }
  .fine { font-size: 11px; color: var(--ink-3); line-height: 1.5; }

  /* 손실 프레이밍 막대 */
  .bar { height: 7px; background: var(--line); border-radius: 4px; overflow: hidden; margin: 4px 0 10px; }
  .bar i { display: block; height: 100%; }

  .sticky {
    position: sticky; bottom: 0; z-index: 20; margin: 16px calc(var(--gutter) * -1) 0;
    padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(180deg, rgba(244,245,247,0), var(--ground) 30%);
  }
  @media (min-width: 900px) { .sticky { position: static; margin: 16px 0 0; padding: 0; background: none; } }

  .foot { border-top: 1px solid var(--line); margin-top: 30px; padding: 22px 0 28px;
          font-size: 12px; color: var(--ink-3); background: var(--card); }
  @media (max-width: 899px) { .foot { padding-bottom: 90px; } }
  .foot-l { display: flex; flex-wrap: wrap; gap: 7px 16px; margin-bottom: 10px; }
  .foot-l a:hover { color: var(--ink-2); }
  .foot-c { font-size: 11px; line-height: 1.7; color: #AEB4BF; }
`;

// Plated-food stand-in: warm ring on a hue-matched ground.
function plate(hue) {
  return `background:
    radial-gradient(46% 46% at 50% 48%, hsl(${hue} 62% 62%) 0%, hsl(${hue} 55% 48%) 58%, transparent 62%),
    radial-gradient(88% 88% at 74% 22%, hsl(${(hue + 26) % 360} 42% 88%), hsl(${hue} 26% 78%))`;
}

function bizRow(r, c) {
  const fee = r.fee === 0 ? `<span class="free">무료배달</span>` : `배달비 ${r.fee.toLocaleString()}원`;
  const flags = r.tags
    .map((t) => `<span class="flag ${t === "쿠폰" ? "flag-c" : "flag-m"}">${t}</span>`)
    .join("");
  return `<a href="/ordernow-club?${c.q}">
    <span class="thumb" style="${plate(r.hue)}"></span>
    <span class="biz-b">
      <span class="biz-n">${r.name}${flags}</span>
      <span class="biz-m">★ <b>${r.rating}</b> (${r.reviews.toLocaleString()}) · ${r.mins[0]}~${r.mins[1]}분</span>
      <span class="biz-f">${fee} · 최소주문 ${r.min.toLocaleString()}원</span>
    </span>
  </a>`;
}

function cats(c, current) {
  return `<nav class="cats">${CATEGORIES.map(
    (k) => `<a href="/ordernow-club?${c.q}"${k === current ? ' aria-current="page"' : ""}>${k}</a>`
  ).join("")}</nav>`;
}

function header(c) {
  return `<header class="top"><div class="shell">
      <div class="top-a">
        <a class="logo" href="/ordernow-club?${c.q}">OrderNow</a>
        <a class="addr" href="/ordernow-club?${c.q}"><span>${ADDRESS}</span><i>▾</i></a>
        <a class="search" href="/ordernow-club?${c.q}">🔎 음식점, 메뉴 검색</a>
        <div class="top-r">
          <a href="/ordernow-club/manage?${c.q}">내 정보</a>
          <a class="cart" href="/ordernow-club?${c.q}">🛒<b>2</b></a>
        </div>
      </div>
    </div></header>`;
}

function footer(c, pagePath) {
  const tabs = [
    ["홈", "🏠", ""],
    ["검색", "🔎", ""],
    ["찜", "♡", ""],
    ["주문내역", "🧾", ""],
    ["내 정보", "👤", "/manage"],
  ];
  const onAcct = pagePath !== "/";
  return `<footer class="foot"><div class="shell">
      <div class="foot-l">
        <a href="/ordernow-club?${c.q}">이용약관</a><a href="/ordernow-club?${c.q}">개인정보처리방침</a>
        <a href="/ordernow-club?${c.q}">고객센터</a><a href="/ordernow-club?${c.q}">사장님 사이트</a>
        <a href="/ordernow-club?${c.q}">공지사항</a>
      </div>
      <p class="foot-c">오더나우 주식회사 · 대표 문세진 · 서울특별시 송파구 올림픽로 300 12층<br>
      사업자등록번호 118-81-33042 · 통신판매업 제2023-서울송파-02918호 · 고객센터 1600-0921<br>
      오더나우는 통신판매중개자이며 통신판매의 당사자가 아닙니다. 상품·거래정보 및 거래에 대한 책임은 판매자에게 있습니다.</p>
    </div></footer>
    <nav class="tabs">${tabs
      .map(
        ([l, i, h]) =>
          `<a href="/ordernow-club${h}?${c.q}"${(h === "/manage") === onAcct ? ' aria-current="page"' : ""}><b>${i}</b>${l}</a>`
      )
      .join("")}</nav>`;
}

module.exports = { THEME, header, footer, bizRow, cats, plate };
