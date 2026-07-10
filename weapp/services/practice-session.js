const STORAGE_KEY = 'weapp_active_practice_session_v1';
const PENDING_COMPLETION_KEY = 'weapp_pending_practice_completion_v1';

function save(session) {
  wx.setStorageSync(STORAGE_KEY, session);
  return session;
}

function getSession() {
  const session = wx.getStorageSync(STORAGE_KEY);
  return session && session.active ? session : null;
}

function getPendingCompletion() {
  const completion = wx.getStorageSync(PENDING_COMPLETION_KEY);
  return completion && completion.elapsedSeconds != null ? completion : null;
}

function getElapsedSeconds(session, now = Date.now()) {
  if (!session) return 0;
  const accumulated = Math.max(0, Number(session.accumulatedSeconds) || 0);
  if (session.paused || session.runningSince == null) return accumulated;
  return accumulated + Math.max(0, Math.floor((now - session.runningSince) / 1000));
}

function start(option, now = Date.now()) {
  return save({
    active: true,
    optionId: option.id,
    label: option.label,
    notes: option.notes || '',
    color_level: Number(option.color_level) || 3,
    startedAt: now,
    runningSince: now,
    accumulatedSeconds: 0,
    paused: false
  });
}

function pause(now = Date.now()) {
  const session = getSession();
  if (!session || session.paused) return session;
  return save({
    ...session,
    accumulatedSeconds: getElapsedSeconds(session, now),
    runningSince: null,
    paused: true
  });
}

function resume(now = Date.now()) {
  const session = getSession();
  if (!session || !session.paused) return session;
  return save({
    ...session,
    runningSince: now,
    paused: false
  });
}

function finish(now = Date.now()) {
  const session = getSession();
  if (!session) return null;
  const finished = {
    ...session,
    elapsedSeconds: getElapsedSeconds(session, now),
    finishedAt: now
  };
  wx.setStorageSync(PENDING_COMPLETION_KEY, finished);
  wx.removeStorageSync(STORAGE_KEY);
  return finished;
}

function discard() {
  wx.removeStorageSync(STORAGE_KEY);
  wx.removeStorageSync(PENDING_COMPLETION_KEY);
}

function clearPendingCompletion() {
  wx.removeStorageSync(PENDING_COMPLETION_KEY);
}

function updatePendingCompletion(updates) {
  const completion = getPendingCompletion();
  if (!completion) return null;
  const next = { ...completion, ...updates };
  wx.setStorageSync(PENDING_COMPLETION_KEY, next);
  return next;
}

module.exports = {
  STORAGE_KEY,
  PENDING_COMPLETION_KEY,
  getSession,
  getPendingCompletion,
  getElapsedSeconds,
  start,
  pause,
  resume,
  finish,
  discard,
  clearPendingCompletion,
  updatePendingCompletion
};
