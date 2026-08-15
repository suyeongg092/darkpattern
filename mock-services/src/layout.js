// `back` is { href, label } — one step up in the current flow, not a link to the
// service list. Without it every page is a dead end you can only leave by
// pressing the browser's back button, which is not how a real app behaves and
// makes the multi-step cancel flows painful to click through in a demo.
function page({ title, accent = "#333", uid, attack, variant = "dark", back, body }) {
  const clean = variant === "clean";
  const backLink = back
    ? `<a href="${back.href}">&larr; ${back.label}</a>`
    : `<a href="/">&larr; 서비스 목록</a>`;
  return `<!doctype html>
<html lang="ko" data-variant="${clean ? "clean" : "dark"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: -apple-system, "Malgun Gothic", sans-serif; max-width: 480px;
         margin: 0 auto; padding: 24px 16px 60px; background: #f7f7f8; color: #1a1a1a; }
  .topbar { display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 20px; font-size: 13px; color: #888; }
  .topbar a { color: #888; }
  .brand { font-weight: 700; font-size: 20px; color: ${accent}; margin-bottom: 4px; }
  .card { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .btn { display: inline-block; padding: 12px 20px; border-radius: 8px; border: none;
         font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none;
         text-align: center; }
  .btn-primary { background: ${accent}; color: #fff; width: 100%; box-sizing: border-box; }
  .btn-ghost { background: transparent; color: #999; font-size: 13px; font-weight: 400;
               text-decoration: underline; }
  .btn-danger-small { background: transparent; color: #aaa; font-size: 12px;
                       text-decoration: underline; }
  .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px;
           background: #eee; color: #555; margin-left: 6px; }
  .attack-badge { background: #ffe1e1; color: #c00; }
  .clean-badge { background: #e3f6e8; color: #1a7f37; }
  fieldset { border: none; padding: 0; margin: 0; }
  label { display: block; padding: 10px 0; border-bottom: 1px solid #eee; }
  details { margin-top: 8px; font-size: 13px; color: #666; }
  input[type=text] { width: 100%; box-sizing: border-box; padding: 10px; margin: 8px 0;
                      border: 1px solid #ddd; border-radius: 6px; }

  /* --- 시정 후(clean) 화면용 --- */
  /* Equal-weight choice row: the shape 공정위 asked for when it required
     '자동결제 해지' and '중도해지' to be offered side by side, and '동의'/'비동의'
     to be equally prominent. Both children are deliberately identical in size,
     colour and weight so neither reads as the only option. */
  .btn-outline { background: #fff; color: ${accent}; border: 1.5px solid ${accent};
                 flex: 1 1 0; box-sizing: border-box; }
  .choice-equal { display: flex; gap: 10px; }
  .choice-equal form { flex: 1 1 0; margin: 0; display: flex; }
  .choice-equal form .btn { width: 100%; }
  .notice { background: #fff; border: 1px solid #d9d9de; border-left: 4px solid ${accent};
            border-radius: 8px; padding: 14px 16px; margin: 12px 0; font-size: 13px; }

  /* --- 다크패턴(dark) 화면용 --- */
  .nag { background: #fff; border-radius: 12px; padding: 24px 20px; margin-bottom: 16px;
         box-shadow: 0 8px 24px rgba(0,0,0,.18); border-top: 4px solid ${accent}; }
  .urgency { background: #fff4e5; color: #b34700; border: 1px solid #ffd8a8;
             border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600;
             margin-bottom: 12px; text-align: center; }
</style>
</head>
<body>
  <div class="topbar">
    ${backLink}
    <span>uid: ${uid}${attack ? '<span class="badge attack-badge">ATTACK MODE</span>' : '<span class="badge">normal</span>'}${
      clean ? '<span class="badge clean-badge">시정 후</span>' : '<span class="badge">시정 전</span>'
    }</span>
  </div>
  ${body}
</body>
</html>`;
}

function qs(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

module.exports = { page, qs };
