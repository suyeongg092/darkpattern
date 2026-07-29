// In-memory subscription state, keyed by "<uid>:<service>". Demo-only store —
// resets on server restart, which is fine since every scenario is scripted to
// start from a clean "active" subscription.

const subscriptions = new Map();

function key(uid, service) {
  return `${uid}:${service}`;
}

function getState(uid, service, defaults) {
  const k = key(uid, service);
  if (!subscriptions.has(k)) {
    subscriptions.set(k, { status: "active", history: [], ...defaults });
  }
  return subscriptions.get(k);
}

function setState(uid, service, patch) {
  const s = getState(uid, service);
  Object.assign(s, patch);
  s.history.push({ at: new Date().toISOString(), ...patch });
  return s;
}

function resetState(uid, service, defaults) {
  const k = key(uid, service);
  subscriptions.set(k, { status: "active", history: [], ...defaults });
  return subscriptions.get(k);
}

module.exports = { getState, setState, resetState };
