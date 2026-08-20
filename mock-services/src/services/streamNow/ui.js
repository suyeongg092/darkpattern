// StreamNow presentation layer: theme, chrome, artwork, rails.
//
// Kept separate from the page definitions so the service file stays readable as
// a description of *what each screen contains and which patterns it carries*,
// rather than a wall of markup.
//
// Artwork is generated from each title's own hue with layered gradients and a
// set typographic lockup. The CSP-free local server could load images, but
// inventing twenty poster files would add megabytes to the repo for a fixture,
// and generated art keeps every title visually distinct without them.

const { RAILS, HERO, WATCHLIST } = require("./catalog");

const THEME = `
  :root {
    --ink:        #0B0D12;
    --surface:    #14171F;
    --surface-2:  #1C212B;
    --line:       #262C38;
    --text:       #F2F4F8;
    --text-2:     #A6AEBF;
    --text-3:     #6E7789;
    --brand:      #8B5CF6;
    --brand-dim:  #6D3FD1;
    --shell-w:    1360px;
    --form-w:     640px;
    --gutter:     16px;
  }
  @media (min-width: 900px) { :root { --gutter: 40px; } }

  body {
    background: var(--ink);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
                 "Malgun Gothic", "맑은 고딕", "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.6;
    padding-bottom: 84px;              /* clears the handheld tab bar */
  }
  @media (min-width: 900px) { body { padding-bottom: 0; } }

  a { color: inherit; text-decoration: none; }
  h1, h2, h3 { margin: 0; letter-spacing: -.02em; line-height: 1.25; }
  p { margin: 0; }

  .shell { max-width: var(--shell-w); margin: 0 auto; padding: 0 var(--gutter); }
  /* A narrow reading column *inside* the shell. Putting max-width on .shell
     itself re-centres that block against the auto margins, so a constrained
     panel would sit centred while the full-width block above it stayed left —
     which is exactly the misalignment the cancel screens had. */
  .col { max-width: 560px; margin-left: auto; margin-right: auto; }
  .stack { display: flex; flex-direction: column; gap: 14px; }

  /* ── 상단 내비 ───────────────────────────────────────── */
  .topnav {
    position: sticky; top: 0; z-index: 40;
    background: linear-gradient(180deg, rgba(11,13,18,.97) 60%, rgba(11,13,18,.75));
    backdrop-filter: saturate(140%) blur(8px);
    border-bottom: 1px solid rgba(38,44,56,.7);
  }
  .topnav-in { display: flex; align-items: center; gap: 22px; height: 56px; }
  @media (min-width: 900px) { .topnav-in { height: 64px; } }
  .wordmark {
    font-size: 19px; font-weight: 800; letter-spacing: -.04em;
    color: var(--text); white-space: nowrap;
  }
  .wordmark i { font-style: normal; color: var(--brand); }
  .navlinks { display: none; gap: 20px; font-size: 14px; color: var(--text-2); }
  @media (min-width: 900px) { .navlinks { display: flex; } }
  .navlinks a:hover { color: var(--text); }
  .navlinks a[aria-current] { color: var(--text); font-weight: 600; }
  .nav-right { margin-left: auto; display: flex; align-items: center; gap: 14px; }
  .nav-search {
    display: none; align-items: center; gap: 8px; height: 34px; padding: 0 12px;
    background: var(--surface-2); border: 1px solid var(--line); border-radius: 6px;
    color: var(--text-3); font-size: 13px; min-width: 190px;
  }
  @media (min-width: 900px) { .nav-search { display: flex; } }
  .avatar {
    width: 30px; height: 30px; border-radius: 6px; flex: none;
    background: linear-gradient(135deg, var(--brand), #3B82F6);
    display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #fff;
  }
  .backlink { font-size: 13px; color: var(--text-2); }
  .backlink:hover { color: var(--text); }

  /* ── 하단 탭 (모바일) ────────────────────────────────── */
  .tabbar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
    display: grid; grid-template-columns: repeat(4, 1fr);
    background: rgba(14,17,23,.96); border-top: 1px solid var(--line);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    backdrop-filter: blur(10px);
  }
  @media (min-width: 900px) { .tabbar { display: none; } }
  .tabbar a {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 9px 0 8px; font-size: 10.5px; color: var(--text-3);
  }
  .tabbar a[aria-current] { color: var(--text); }
  .tabbar b { font-size: 17px; font-weight: 400; line-height: 1; }

  /* ── 히어로 ──────────────────────────────────────────── */
  .hero { position: relative; margin-bottom: 26px; }
  .hero-art { position: relative; aspect-ratio: 3/4; }
  @media (min-width: 700px) { .hero-art { aspect-ratio: 21/9; } }
  .hero-art::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(11,13,18,.15) 0%, rgba(11,13,18,.55) 55%, var(--ink) 100%);
  }
  @media (min-width: 700px) {
    .hero-art::after {
      background: linear-gradient(90deg, rgba(11,13,18,.94) 0%, rgba(11,13,18,.62) 45%, rgba(11,13,18,.15) 100%),
                  linear-gradient(180deg, transparent 60%, var(--ink) 100%);
    }
  }
  .hero-copy {
    position: absolute; left: 0; right: 0; bottom: 22px; z-index: 2;
    padding: 0 var(--gutter);
  }
  @media (min-width: 700px) {
    .hero-copy { max-width: 560px; bottom: 46px; top: auto; }
  }
  .hero-kicker { font-size: 11.5px; letter-spacing: .12em; color: var(--brand); font-weight: 700; }
  .hero-title { font-size: 30px; font-weight: 800; margin: 6px 0 8px; }
  @media (min-width: 700px) { .hero-title { font-size: 46px; } }
  .hero-meta { font-size: 13px; color: var(--text-2); }
  .hero-desc { font-size: 14px; color: var(--text-2); margin-top: 10px; display: none; }
  @media (min-width: 700px) { .hero-desc { display: block; } }
  .hero-actions { display: flex; gap: 10px; margin-top: 16px; }

  /* ── 레일 ────────────────────────────────────────────── */
  .rail { margin-bottom: 26px; }
  .rail-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
  .rail-head h2 { font-size: 16px; font-weight: 700; }
  @media (min-width: 900px) { .rail-head h2 { font-size: 18px; } }
  .rail-more { font-size: 12.5px; color: var(--text-3); margin-left: auto; }
  .rail-track {
    display: grid; grid-auto-flow: column; grid-auto-columns: 132px; gap: 10px;
    overflow-x: auto; scroll-snap-type: x mandatory;
    padding-bottom: 4px; scrollbar-width: thin;
  }
  @media (min-width: 900px) { .rail-track { grid-auto-columns: 176px; gap: 14px; } }
  .rail-track::-webkit-scrollbar { height: 6px; }
  .rail-track::-webkit-scrollbar-thumb { background: var(--line); border-radius: 3px; }
  .tile { scroll-snap-align: start; }
  .tile-art { position: relative; aspect-ratio: 2/3; border-radius: 4px; overflow: hidden; }
  .tile:hover .tile-art { outline: 2px solid var(--text); outline-offset: 1px; }
  .tile-name { font-size: 12.5px; margin-top: 7px; color: var(--text); line-height: 1.35; }
  .tile-meta { font-size: 11.5px; color: var(--text-3); }
  .tile-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: rgba(255,255,255,.22); }
  .tile-bar i { display: block; height: 100%; background: var(--brand); }
  .tile-flag {
    position: absolute; top: 6px; left: 6px; font-size: 10px; font-weight: 700;
    background: rgba(11,13,18,.78); color: var(--text); padding: 2px 6px; border-radius: 3px;
  }

  /* 아트워크 — 제목별 색상에서 생성 */
  .art { position: absolute; inset: 0; display: grid; place-items: center; padding: 10px; }
  .art span {
    position: relative; z-index: 1; font-size: 13px; font-weight: 800; text-align: center;
    letter-spacing: -.03em; color: rgba(255,255,255,.94); text-shadow: 0 1px 12px rgba(0,0,0,.55);
    word-break: keep-all;
  }
  .hero-art .art span { font-size: 0; }

  /* ── 계정 영역 ───────────────────────────────────────── */
  .acct { padding-top: 22px; padding-bottom: 40px; }
  /* 계정 화면 본문 폭. 셸이 넣어주는 제출 버튼(.form-submit-grid)이 같은 값을 써야
     본문과 좌우 끝이 맞는다. */
  .acct-grid { display: block; }
  @media (min-width: 900px) {
    .acct-grid { display: grid; grid-template-columns: 232px minmax(0, var(--form-w)); gap: 40px; align-items: start; }
  }
  .acct-side { display: none; }
  @media (min-width: 900px) {
    .acct-side { display: block; position: sticky; top: 88px; }
    .acct-side .side-h { font-size: 11.5px; letter-spacing: .1em; color: var(--text-3); margin-bottom: 10px; }
  }
  .acct-h { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  @media (min-width: 900px) { .acct-h { font-size: 26px; } }
  .acct-sub { font-size: 13.5px; color: var(--text-2); margin-bottom: 18px; }
  .crumb { font-size: 12px; color: var(--text-3); margin-bottom: 10px; }
  .crumb a:hover { color: var(--text-2); }

  .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }
  .panel + .panel { margin-top: 14px; }
  .panel-pad { padding: 18px 18px; }
  @media (min-width: 900px) { .panel-pad { padding: 22px 24px; } }
  .panel-h { font-size: 14px; font-weight: 700; margin-bottom: 12px; }

  .rowlist { display: flex; flex-direction: column; }
  .rowlist > * { display: flex; align-items: center; gap: 12px; justify-content: space-between;
                 padding: 14px 18px; border-top: 1px solid var(--line); font-size: 14px;
                 min-height: 52px; }
  @media (min-width: 900px) { .rowlist > * { padding: 14px 24px; } }
  .rowlist > *:first-child { border-top: none; }
  .rowlist a:hover { background: var(--surface-2); }
  .rowlist .chev { color: var(--text-3); font-size: 15px; }
  .rowlist .val { color: var(--text-2); font-size: 13px; margin-left: auto; }

  .kv { display: flex; justify-content: space-between; gap: 14px; padding: 8px 0; font-size: 13.5px; }
  .kv + .kv { border-top: 1px solid var(--line); }
  .kv dt { color: var(--text-2); }
  .kv dd { margin: 0; color: var(--text); font-variant-numeric: tabular-nums; }

  .pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 3px 8px;
          border-radius: 4px; background: var(--surface-2); color: var(--text-2);
          border: 1px solid var(--line); }
  .pill-live { background: rgba(139,92,246,.14); color: #C4B5FD; border-color: rgba(139,92,246,.35); }

  /* ── 버튼 ────────────────────────────────────────────── */
  .b { display: inline-flex; align-items: center; justify-content: center; gap: 7px;
       min-height: 44px; padding: 0 18px; border-radius: 6px; border: 1px solid transparent;
       font-size: 14.5px; font-weight: 600; cursor: pointer; text-align: center; }
  .b-fill { background: var(--brand); color: #fff; }
  .b-fill:hover { background: var(--brand-dim); }
  .b-line { background: transparent; color: var(--text); border-color: #3A4252; }
  .b-line:hover { border-color: var(--text-2); }
  .b-soft { background: var(--surface-2); color: var(--text); border-color: var(--line); }
  .b-wide { width: 100%; }
  .b-sm { min-height: 38px; font-size: 13.5px; padding: 0 14px; }
  .b-txt { background: none; border: none; padding: 0; min-height: 0;
           font-size: 13px; font-weight: 400; color: var(--text-2); text-decoration: underline; cursor: pointer; }
  .b-mute { background: none; border: none; padding: 0; min-height: 0;
            font-size: 12px; font-weight: 400; color: var(--text-3); text-decoration: underline; cursor: pointer; }
  /* The page shell injects the multi-block form's submit button with these
     class names, so they are styled to match this service rather than the
     default shell. */
  .form-submit { max-width: var(--shell-w); margin: 14px auto 0;
                 padding-left: var(--gutter); padding-right: var(--gutter); }
  .form-submit > .btn { max-width: var(--form-w); margin-left: auto; margin-right: auto; }
  /* 본문이 사이드바 격자 안에 있는 페이지(설문 등)에서는 버튼도 같은 칸에 놓는다.
     가운데 정렬로 두면 본문은 232px 만큼 밀려 있는데 버튼만 화면 기준으로 가운데에
     서서 두 블록이 어긋난다. */
  .form-submit-grid > .btn { margin-left: 0; margin-right: 0; }
  @media (min-width: 900px) {
    .form-submit-grid { display: grid; grid-template-columns: 232px minmax(0, var(--form-w)); gap: 40px; }
    .form-submit-grid > .btn { grid-column: 2; max-width: none; }
  }
  .btn { display: inline-flex; align-items: center; justify-content: center;
         min-height: 46px; padding: 0 18px; border-radius: 6px; border: none;
         font-size: 15px; font-weight: 600; cursor: pointer; text-align: center; }
  .btn-primary { background: var(--brand); color: #fff; }
  .btn-primary:hover { background: var(--brand-dim); }

  .brow { display: flex; gap: 10px; }
  .brow > * { flex: 1 1 0; }
  .brow form { display: flex; margin: 0; }
  .brow form .b { width: 100%; }

  /* ── 폼 ──────────────────────────────────────────────── */
  .opt { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px;
         border: 1px solid var(--line); border-radius: 8px; background: var(--surface);
         cursor: pointer; }
  .opt + .opt { margin-top: 8px; }
  .opt:hover { border-color: #39414F; }
  .opt input { margin: 2px 0 0; accent-color: var(--brand); width: 17px; height: 17px; flex: none; }
  .opt-b { font-size: 14px; font-weight: 600; }
  .opt-d { font-size: 12.5px; color: var(--text-2); margin-top: 3px; }
  .opt-n { font-size: 12px; color: var(--brand); margin-top: 4px; font-weight: 600; }
  .opt-price { margin-left: auto; font-size: 14px; font-weight: 700; white-space: nowrap;
               font-variant-numeric: tabular-nums; }
  .chk { display: flex; gap: 11px; align-items: flex-start; padding: 11px 0; font-size: 13.5px;
         color: var(--text-2); border-top: 1px solid var(--line); cursor: pointer; }
  .chk:first-child { border-top: none; }
  .chk input { margin: 2px 0 0; accent-color: var(--brand); width: 17px; height: 17px; flex: none; }
  .field { width: 100%; height: 44px; padding: 0 12px; background: var(--surface-2);
           border: 1px solid var(--line); border-radius: 6px; color: var(--text); }

  .fine { font-size: 10px; line-height: 1.45; color: #3E4553; margin-top: 8px; }
  .terms { background: var(--surface-2); border: 1px solid var(--line); border-left: 3px solid var(--brand);
           border-radius: 6px; padding: 13px 15px; font-size: 13.5px; color: var(--text); margin-top: 12px; }
  .terms b { display: block; font-size: 12.5px; color: var(--text-2); margin-bottom: 4px; font-weight: 700; }

  .promo { display: flex; align-items: center; gap: 8px; justify-content: center;
           background: linear-gradient(90deg, rgba(139,92,246,.18), rgba(59,130,246,.12));
           border: 1px solid rgba(139,92,246,.3); border-radius: 8px;
           padding: 10px 14px; font-size: 13px; font-weight: 600; color: #DDD6FE; margin-bottom: 16px; }

  /* 모바일에서 결정 버튼이 스크롤에 묻히지 않게 */
  .sticky-act {
    position: sticky; bottom: 0; z-index: 20; margin: 18px calc(var(--gutter) * -1) 0;
    padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom, 0px));
    background: linear-gradient(180deg, rgba(11,13,18,0), var(--ink) 26%);
  }
  @media (min-width: 900px) {
    .sticky-act { position: static; margin: 18px 0 0; padding: 0; background: none; }
  }

  .foot { border-top: 1px solid var(--line); margin-top: 46px; padding: 26px 0 34px;
          font-size: 12.5px; color: var(--text-3); }
  @media (max-width: 899px) { .foot { padding-bottom: 96px; } }
  .foot-links { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-bottom: 12px; }
  .foot-links a:hover { color: var(--text-2); }
  .foot-co { line-height: 1.75; color: #545C6C; font-size: 11.5px; }
`;

// Deterministic poster art from the title's hue.
function art(t, big) {
  const h = t.hue;
  const g = `background:
      radial-gradient(120% 90% at 22% 12%, hsl(${h} 78% ${t.tone + 16}%) 0%, transparent 58%),
      radial-gradient(120% 110% at 88% 96%, hsl(${(h + 42) % 360} 66% ${Math.max(12, t.tone - 14)}%) 0%, transparent 62%),
      linear-gradient(158deg, hsl(${h} 46% ${Math.max(8, t.tone - 22)}%), hsl(${(h + 20) % 360} 34% 8%))`;
  return `<div class="art" style="${g}"><span>${big ? "" : t.title}</span></div>`;
}

function tile(t, c) {
  const meta = t.kind === "영화" ? `${t.year} · ${t.mins}분` : `${t.year} · ${t.eps}부작`;
  return `<a class="tile" href="/streamnow?${c.q}">
    <div class="tile-art">${art(t)}
      ${t.badge ? `<span class="tile-flag">${t.badge}</span>` : ""}
      ${t.progress ? `<span class="tile-bar"><i style="width:${Math.round(t.progress * 100)}%"></i></span>` : ""}
    </div>
    <div class="tile-name">${t.title}</div>
    <div class="tile-meta">${meta}</div>
  </a>`;
}

function rail(r, c) {
  return `<section class="rail">
    <div class="rail-head"><h2>${r.label}</h2><span class="rail-more">모두 보기 &rsaquo;</span></div>
    <div class="rail-track u-scroll-x">${r.items.map((t) => tile(t, c)).join("")}</div>
  </section>`;
}

function heroBlock(c, subscribed) {
  const t = HERO;
  return `<section class="hero">
    <div class="hero-art">${art(t, true)}</div>
    <div class="hero-copy">
      <div class="hero-kicker">이번 주 1위</div>
      <h1 class="hero-title">${t.title}</h1>
      <div class="hero-meta">${t.year} · ${t.mins}분 · 15세 이상 · 스릴러</div>
      <p class="hero-desc">국경 통제소에서 사라진 화물 한 칸을 쫓는 세관 조사관과, 그 화물을 되찾아야만 하는 운반책의 나흘.</p>
      <div class="hero-actions">
        <a class="b b-fill" href="/streamnow?${c.q}">▶ 재생</a>
        <a class="b b-soft" href="/streamnow?${c.q}">＋ 내가 찜한 콘텐츠</a>
      </div>
    </div>
  </section>`;
}

function rails(c) {
  return RAILS.map((r) => rail(r, c)).join("");
}

// Watchlist strip used by the first retention screen so its "14편" is backed by
// actual titles rather than being an unsupported number.
function watchStrip(c, n) {
  return `<div class="rail-track u-scroll-x">${WATCHLIST.slice(0, n)
    .map((t) => tile(t, c))
    .join("")}</div>`;
}

const NAV = [
  ["/", "홈"],
  ["/", "시리즈"],
  ["/", "영화"],
  ["/", "다큐"],
];

function header(c, back, pagePath) {
  const inAccount = pagePath !== "/";
  return `<header class="topnav"><div class="shell topnav-in">
      <a class="wordmark" href="/streamnow?${c.q}">Stream<i>Now</i></a>
      <nav class="navlinks">${NAV.map(([h, l], i) => `<a href="/streamnow?${c.q}"${!inAccount && i === 0 ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      <div class="nav-right">
        <span class="nav-search">🔎 작품, 인물, 장르 검색</span>
        ${inAccount ? `<a class="backlink" href="${back.href}">&larr; ${back.label}</a>` : ""}
        <span class="avatar" title="계정 ${c.uid}">${String(c.uid).slice(0, 1).toUpperCase()}</span>
      </div>
    </div></header>`;
}

function footer(c, pagePath) {
  const tabs = [
    ["홈", "▤", "/"],
    ["검색", "🔎", "/"],
    ["보관함", "▧", "/"],
    ["내 정보", "▨", "/manage"],
  ];
  const onAccount = pagePath !== "/";
  return `<footer class="foot"><div class="shell">
      <div class="foot-links">
        <a href="/streamnow?${c.q}">이용약관</a><a href="/streamnow?${c.q}">개인정보처리방침</a>
        <a href="/streamnow?${c.q}">청소년보호정책</a><a href="/streamnow?${c.q}">고객센터</a>
        <a href="/streamnow?${c.q}">기기 관리</a><a href="/streamnow?${c.q}">공지사항</a>
      </div>
      <p class="foot-co">스트림나우 주식회사 · 대표 정하윤 · 서울특별시 마포구 월드컵북로 396<br>
      사업자등록번호 214-88-01923 · 통신판매업 제2024-서울마포-04127호 · 고객센터 1588-0117 (09:00~18:00)</p>
    </div></footer>
    <nav class="tabbar">${tabs
      .map(([l, i, h]) => `<a href="/streamnow${h === "/" ? "" : h}?${c.q}"${(h === "/manage") === onAccount ? ' aria-current="page"' : ""}><b>${i}</b>${l}</a>`)
      .join("")}</nav>`;
}

module.exports = { THEME, header, footer, heroBlock, rails, watchStrip, tile, art };
