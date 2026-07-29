function ctx(req) {
  const uid = req.query.uid || req.body.uid || "demo";
  const raw = req.query.attack ?? req.body.attack ?? "";
  const attack = ["1", "true", "on"].includes(String(raw));
  return { uid, attack };
}

module.exports = { ctx };
