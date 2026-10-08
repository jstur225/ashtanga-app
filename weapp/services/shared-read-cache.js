const DEFAULT_TTL_MS = 30 * 1000;
const states = new Map();

function getState(key) {
  if (!states.has(key)) {
    states.set(key, { promise: null, lastSuccessAt: 0 });
  }
  return states.get(key);
}

function run(key, loader, options = {}) {
  const state = getState(key);
  const ttlMs = Math.max(0, Number(options.ttlMs) || DEFAULT_TTL_MS);
  const canUseCached = typeof options.canUseCached === 'function'
    ? options.canUseCached
    : () => false;
  const readCached = typeof options.readCached === 'function'
    ? options.readCached
    : () => undefined;

  if (state.promise) return state.promise;
  if (!options.force && state.lastSuccessAt && Date.now() - state.lastSuccessAt < ttlMs && canUseCached()) {
    return Promise.resolve(readCached());
  }

  let result;
  try {
    result = loader();
  } catch (error) {
    return Promise.reject(error);
  }
  state.promise = Promise.resolve(result)
    .then((value) => {
      state.lastSuccessAt = Date.now();
      return value;
    })
    .finally(() => {
      state.promise = null;
    });
  return state.promise;
}

function invalidate(keyOrPrefix = '') {
  if (!keyOrPrefix) {
    states.clear();
    return;
  }
  Array.from(states.keys()).forEach((key) => {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) states.delete(key);
  });
}

module.exports = {
  DEFAULT_TTL_MS,
  run,
  invalidate
};
