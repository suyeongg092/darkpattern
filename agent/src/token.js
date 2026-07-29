// One-time execution token: HMAC-signed so it can't be forged or edited
// (action/service/uid/expiry are baked into the signed payload), and
// single-use so a captured token can't be replayed for a second execution.

const crypto = require("crypto");

const SECRET = process.env.AGENT_TOKEN_SECRET || "demo-secret-change-me";
const redeemed = new Set();

function issueToken(payload) {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  return Buffer.from(JSON.stringify({ payload, sig })).toString("base64url");
}

function redeemToken(token) {
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(token, "base64url").toString());
  } catch {
    return { valid: false, reason: "malformed token" };
  }
  const { payload, sig } = decoded;
  const expected = crypto.createHmac("sha256", SECRET).update(JSON.stringify(payload)).digest("hex");
  if (sig !== expected) return { valid: false, reason: "signature mismatch (token was tampered with)" };
  if (payload.expires_at && Date.now() > payload.expires_at) return { valid: false, reason: "token expired" };
  if (redeemed.has(sig)) return { valid: false, reason: "token already redeemed (replay blocked)" };
  redeemed.add(sig);
  return { valid: true, payload };
}

module.exports = { issueToken, redeemToken };
