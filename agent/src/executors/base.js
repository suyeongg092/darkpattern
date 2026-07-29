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

module.exports = { extractFormInfo };
