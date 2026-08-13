// Two independent switches ride on every request, and keeping them orthogonal
// matters:
//
//   attack=1        ADI integrity simulation — page content is tampered with so
//                   the *agent* is misled (agent/ verifies against this).
//   variant=clean   Dark-pattern switch — renders the 공정위 "시정 후" version of
//                   the same page (detector/ is scored against this).
//
// They answer different questions ("can the agent be fooled?" vs "can the
// detector spot a dark pattern?"), so they must never be collapsed into one
// flag: a clean page can still be under ADI attack, and that combination is
// exactly what proves the two layers are independent.

function ctx(req) {
  const uid = req.query.uid || req.body.uid || "demo";
  const rawAttack = req.query.attack ?? req.body.attack ?? "";
  const attack = ["1", "true", "on"].includes(String(rawAttack));
  const rawVariant = String(req.query.variant ?? req.body.variant ?? "").toLowerCase();
  const variant = ["clean", "fixed", "after"].includes(rawVariant) ? "clean" : "dark";
  return { uid, attack, variant };
}

module.exports = { ctx };
