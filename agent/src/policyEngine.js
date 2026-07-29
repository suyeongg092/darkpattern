// The rule engine that actually decides whether an action proceeds. Policy
// drafting (policy.js) may one day involve an LLM; this file never does —
// every check here is a plain comparison against the policy object.

function checkBeforeSubmit(policy, observed) {
  const { expectedFormAction, expectedFields } = policy.preCheck || {};

  if (expectedFormAction && observed.formAction !== expectedFormAction) {
    return {
      ok: false,
      reason: `form action mismatch: policy expected "${expectedFormAction}", page actually submits to "${observed.formAction}"`,
    };
  }

  if (expectedFields) {
    for (const [field, expected] of Object.entries(expectedFields)) {
      const actual = observed.fields[field];
      if (String(actual) !== String(expected)) {
        return {
          ok: false,
          reason: `hidden field "${field}" mismatch: policy expected "${expected}", page actually submits "${actual}"`,
        };
      }
    }
  }

  return { ok: true };
}

function checkAfterExecution(policy, statusAfter, context = {}) {
  const { requireStatus, forbidFlags = [], feeTolerance } = policy.postCheck || {};

  if (requireStatus && statusAfter.status !== requireStatus) {
    return {
      ok: false,
      reason: `post-execution status mismatch: expected "${requireStatus}", actual "${statusAfter.status}" (service note: "${statusAfter.note || ""}")`,
    };
  }

  for (const flag of forbidFlags) {
    if (statusAfter[flag]) {
      return { ok: false, reason: `forbidden flag "${flag}" is set on the actual account state` };
    }
  }

  if (
    feeTolerance !== undefined &&
    context.disclosedFee !== undefined &&
    statusAfter.feeCharged !== undefined
  ) {
    const diff = Math.abs(statusAfter.feeCharged - context.disclosedFee);
    if (diff > feeTolerance) {
      return {
        ok: false,
        reason: `charged amount (${statusAfter.feeCharged}) differs from the amount disclosed at confirmation (${context.disclosedFee}) by ${diff}, exceeding tolerance ${feeTolerance}`,
      };
    }
  }

  return { ok: true };
}

module.exports = { checkBeforeSubmit, checkAfterExecution };
