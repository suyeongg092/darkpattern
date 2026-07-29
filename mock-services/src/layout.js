function page({ title, accent = "#333", uid, attack, body }) {
  return `<!doctype html>
<html lang="ko">
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
  fieldset { border: none; padding: 0; margin: 0; }
  label { display: block; padding: 10px 0; border-bottom: 1px solid #eee; }
  details { margin-top: 8px; font-size: 13px; color: #666; }
  input[type=text] { width: 100%; box-sizing: border-box; padding: 10px; margin: 8px 0;
                      border: 1px solid #ddd; border-radius: 6px; }
</style>
</head>
<body>
  <div class="topbar">
    <a href="/">&larr; 목업 서비스 목록</a>
    <span>uid: ${uid}${attack ? '<span class="badge attack-badge">ATTACK MODE</span>' : '<span class="badge">normal</span>'}</span>
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
