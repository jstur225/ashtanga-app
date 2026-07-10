const test = require('node:test');
const assert = require('node:assert/strict');

const storage = new Map();
global.wx = {
  getStorageSync(key) { return storage.get(key); },
  setStorageSync(key, value) { storage.set(key, value); },
  removeStorageSync(key) { storage.delete(key); }
};

const session = require('../services/practice-session');

test.beforeEach(() => storage.clear());

test('计时开始、暂停和继续会累计真实秒数', () => {
  session.start({ id: 'one', label: '一序列', notes: 'Mysore' }, 1000);
  assert.equal(session.getElapsedSeconds(session.getSession(), 6500), 5);
  session.pause(6500);
  assert.equal(session.getSession().paused, true);
  assert.equal(session.getElapsedSeconds(session.getSession(), 20000), 5);
  session.resume(20000);
  assert.equal(session.getElapsedSeconds(session.getSession(), 23500), 8);
});

test('重新读取持久化 session 后仍能恢复计时', () => {
  session.start({ id: 'half', label: '半序列' }, 10000);
  const restored = session.getSession();
  assert.equal(restored.label, '半序列');
  assert.equal(session.getElapsedSeconds(restored, 71000), 61);
});

test('结束返回最终时长并清理活动 session', () => {
  session.start({ id: 'one', label: '一序列' }, 0);
  const result = session.finish(90500);
  assert.equal(result.elapsedSeconds, 90);
  assert.equal(session.getSession(), null);
  assert.equal(session.getPendingCompletion().elapsedSeconds, 90);
  session.updatePendingCompletion({ completionNotes: '肩膀放松' });
  assert.equal(session.getPendingCompletion().completionNotes, '肩膀放松');
  session.clearPendingCompletion();
  assert.equal(session.getPendingCompletion(), null);
});

test('放弃练习直接清理 session', () => {
  session.start({ id: 'one', label: '一序列' }, 0);
  session.discard();
  assert.equal(session.getSession(), null);
});
