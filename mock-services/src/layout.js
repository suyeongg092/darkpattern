// Shared page shell.
//
// Nothing rendered here may reveal which experimental condition a page is in.
// Earlier revisions stamped `data-variant="dark|clean"` on <html> and printed
// "시정 전 / 시정 후 / ATTACK MODE" badges in the header, and named CSS classes
// after the very patterns under test (`.nag`, `.urgency`). A detector could read
// the answer off the document without looking at a single interface element,
// which made every accuracy number meaningless. Condition now travels only in
// the URL, which the scoring script knows and the detector must not parse.
//
// Two levels of ownership:
//   - this file: structure, reset, focus handling, neutral primitives
//   - each service: its own `theme` CSS and `header`/`footer` markup
// Services that supply neither keep the plain shell below, so a service can be
// restyled without touching the other five.

// Structural only — no brand identity. Safe for every service to inherit.
const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; }
  img { max-width: 100%; }
  button, input, select, textarea { font: inherit; color: inherit; }

  /* The cancel flows are meant to be operable by keyboard and by an automation
     agent, so focus has to be visible. */
  :focus-visible { outline: 2px solid currentColor; outline-offset: 2px; border-radius: 2px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
  .u-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden;
              clip: rect(0 0 0 0); white-space: nowrap; }
`;

// The pre-existing look, kept byte-for-byte apart from the renamed classes, so
// the five services that have not been restyled render exactly as before.
const PLAIN_CSS = (accent) => `
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
  .btn-quiet { background: transparent; color: #aaa; font-size: 12px;
               text-decoration: underline; }
  .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px;
           background: #eee; color: #555; margin-left: 6px; }
  fieldset { border: none; padding: 0; margin: 0; }
  label { display: block; padding: 10px 0; border-bottom: 1px solid #eee; }
  details { margin-top: 8px; font-size: 13px; color: #666; }
  input[type=text] { width: 100%; box-sizing: border-box; padding: 10px; margin: 8px 0;
                      border: 1px solid #ddd; border-radius: 6px; }

  /* Equal-weight choice row: the shape 공정위 asked for when it required
     '자동결제 해지' and '중도해지' to be offered side by side, and '동의'/'비동의'
     to be equally prominent. */
  .btn-outline { background: #fff; color: ${accent}; border: 1.5px solid ${accent};
                 flex: 1 1 0; box-sizing: border-box; }
  .choice-equal { display: flex; gap: 10px; }
  .choice-equal form { flex: 1 1 0; margin: 0; display: flex; }
  .choice-equal form .btn { width: 100%; }
  .notice { background: #fff; border: 1px solid #d9d9de; border-left: 4px solid ${accent};
            border-radius: 8px; padding: 14px 16px; margin: 12px 0; font-size: 13px; }

  .panel-raised { background: #fff; border-radius: 12px; padding: 24px 20px; margin-bottom: 16px;
                  box-shadow: 0 8px 24px rgba(0,0,0,.18); border-top: 4px solid ${accent}; }
  .strip { background: #fff4e5; color: #b34700; border: 1px solid #ffd8a8;
           border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600;
           margin-bottom: 12px; text-align: center; }
`;

function page({
  title,
  accent = "#333",
  uid,
  back,
  body,
  theme,          // service-owned CSS; omit to keep the plain shell
  header,         // service-owned markup above the content
  footer,         // service-owned markup below the content
  bodyClass = "",
}) {
  const backLink = back
    ? `<a href="${back.href}">&larr; ${back.label}</a>`
    : `<a href="/">&larr; 서비스 목록</a>`;

  const chrome =
    header !== undefined
      ? header
      : `<div class="topbar">${backLink}<span>${uid ? `계정 ${uid}` : ""}</span></div>`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<style>${BASE_CSS}
${theme || PLAIN_CSS(accent)}
</style>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
${chrome}
${body}
${footer || ""}
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
