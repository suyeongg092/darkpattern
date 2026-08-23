// Intent -> policy conversion. Deliberately not an LLM call: the mapping from
// service name to preCheck/postCheck is a fixed whitelist, and instruction
// parsing is a narrow keyword check, so this step can't be talked into
// authorizing an action it doesn't already know about.

const SERVICE_TEMPLATES = {
  "ordernow-club": {
    // The attack this service demonstrates (fake success screen) leaves no
    // trace in the DOM before submission, so there is nothing to pre-check —
    // only the post-execution status reconciliation catches it.
    preCheck: null,
    postCheck: { requireStatus: "cancelled" },
  },
  "supercart-plus": {
    preCheck: {
      expectedFormAction: "/supercart-plus/cancel/confirm",
      expectedFields: { action: "full_cancel" },
    },
    postCheck: { requireStatus: "cancelled", forbidFlags: ["downgraded"] },
  },
  primevault: {
    preCheck: { expectedFormAction: "/primevault/end-benefits" },
    postCheck: { requireStatus: "cancelled" },
  },
  cloudstudio: {
    // Attack here is a disclosed-vs-charged amount mismatch — the disclosed
    // fee looks fine at confirm time, so only the post-execution amount
    // reconciliation (against what was actually shown, with a tolerance)
    // catches it.
    preCheck: null,
    postCheck: { requireStatus: "cancelled", feeTolerance: 0 },
  },
  streamnow: {
    // Same shape as ordernow-club's attack: the confirm screen reports a
    // completed cancellation while the paid conversion stays scheduled.
    // Nothing in the confirm form's DOM is tampered with beforehand.
    preCheck: null,
    postCheck: { requireStatus: "cancelled" },
  },
  readwell: {
    // Compliant control service — mock-services defines no attack mode for
    // it at all, so this preCheck never actually fires a block; it's a
    // sanity check that the account-view executor is still submitting to the
    // endpoint the policy expects. "정기결제 해지" leaves the account
    // "scheduled" (usable through period end), not "cancelled".
    preCheck: { expectedFormAction: "/readwell/cancel" },
    postCheck: { requireStatus: "scheduled" },
  },
};

function draftPolicy(instruction, service, uid) {
  const template = SERVICE_TEMPLATES[service];
  if (!template) {
    throw new Error(`unknown service: ${service}`);
  }
  if (!/해지|취소|종료|cancel/i.test(instruction)) {
    throw new Error(`instruction does not authorize a cancellation: "${instruction}"`);
  }
  return {
    action: "cancel_subscription",
    service,
    uid,
    instruction,
    issued_at: Date.now(),
    expires_at: Date.now() + 5 * 60 * 1000,
    preCheck: template.preCheck,
    postCheck: template.postCheck,
  };
}

module.exports = { draftPolicy, SERVICE_TEMPLATES };
