async function extractFormInfo(page, formSelector = "form") {
  return page.$eval(formSelector, (form) => {
    const fields = {};
    for (const el of form.querySelectorAll("input[name]")) {
      fields[el.name] = el.value;
    }
    // Read the "action" attribute directly, not the form.action DOM
    // property: a hidden input named "action" (as SuperCart Plus has) shadows
    // that property per the HTML spec's named-getter behavior, so form.action
    // silently returns the <input> element instead of the submit URL.
    const rawAction = form.getAttribute("action") || "";
    const resolved = new URL(rawAction, window.location.href);
    return { action: resolved.pathname, fields };
  });
}

const SLOW = process.env.SLOW_DEMO === "1";

// Renders a visible dot that tracks Playwright's synthetic mouse — headless
// Chrome has no OS cursor, so without this the live screencast just shows
// pages changing with no visible cause. addInitScript re-runs on every
// navigation, so it survives the whole multi-page dark-pattern flow.
async function injectCursor(page) {
  if (!SLOW) return;
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = `
      #__agent-cursor {
        position: fixed; top: 0; left: 0; width: 16px; height: 16px;
        border-radius: 50%; background: #2dd4bf; border: 2px solid #ffffff;
        box-shadow: 0 0 0 3px rgba(45,212,191,.35), 0 2px 8px rgba(0,0,0,.5);
        pointer-events: none; z-index: 2147483647;
        transform: translate(-50%, -50%);
      }
    `;
    document.documentElement.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "__agent-cursor";
    const mount = () => document.body && document.body.appendChild(cursor);
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount);
    window.addEventListener("mousemove", (e) => {
      cursor.style.left = e.clientX + "px";
      cursor.style.top = e.clientY + "px";
    });
  });
}

// Glides the (visible, in SLOW mode) cursor to an element and highlights it
// before the caller performs the actual click/check/fill, so a viewer can
// see what the agent is about to do, not just the result.
async function pointerTo(page, selector) {
  if (!SLOW) return;
  try {
    const el = page.locator(selector).first();
    const box = await el.boundingBox({ timeout: 3000 });
    if (!box) return;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
    await el
      .evaluate((node) => {
        node.style.outline = "3px solid #2dd4bf";
        node.style.outlineOffset = "2px";
        node.style.transition = "outline-color .15s";
      })
      .catch(() => {});
    await page.waitForTimeout(450);
  } catch {
    // best-effort only — never let the demo-polish layer break a real run
  }
}

// Pause after a navigation so the resulting page is on screen long enough
// to actually read, instead of flashing past in the live view.
async function settle(page) {
  if (SLOW) await page.waitForTimeout(550);
}

module.exports = { extractFormInfo, injectCursor, pointerTo, settle };
