const DEFAULT_TTL_MS = 10 * 1000;
const states = Object.create(null);

function getState(key) {
  if (!states[key]) {
    states[key] = { lastSuccessAt: 0, promise: null };
  }
  return states[key];
}

function run(key, task, options = {}) {
  const state = getState(key);
  const ttlMs = Math.max(0, Number(options.ttlMs) || DEFAULT_TTL_MS);
  if (state.promise) return state.promise;
  if (!options.force && state.lastSuccessAt && Date.now() - state.lastSuccessAt < ttlMs) {
    return Promise.resolve({ skipped: true, reason: 'fresh' });
  }
  state.promise = Promise.resolve()
    .then(task)
    .then((result) => {
      state.lastSuccessAt = Date.now();
      return result;
    })
    .finally(() => {
      state.promise = null;
    });
  return state.promise;
}

function reset(key) {
  if (key) delete states[key];
  else Object.keys(states).forEach((item) => delete states[item]);
}

module.exports = {
  DEFAULT_TTL_MS,
  run,
  reset
};
