const assert = require('node:assert/strict');
const test = require('node:test');

const pageRefreshGate = require('../services/page-refresh-gate');

test.beforeEach(() => pageRefreshGate.reset());

test('页面后台刷新会合并并发调用，并在短时间重复进入时使用新鲜缓存', async () => {
  let callCount = 0;
  let finishTask;
  const task = () => {
    callCount += 1;
    return new Promise((resolve) => { finishTask = resolve; });
  };

  const first = pageRefreshGate.run('profile:cloud:user-1', task);
  const concurrent = pageRefreshGate.run('profile:cloud:user-1', task);
  assert.equal(first, concurrent);
  assert.equal(callCount, 0);
  await Promise.resolve();
  assert.equal(callCount, 1);
  finishTask({ ok: true });
  await first;

  const cached = await pageRefreshGate.run('profile:cloud:user-1', task);
  assert.deepEqual(cached, { skipped: true, reason: 'fresh' });
  assert.equal(callCount, 1);
});

test('明确强制刷新时不会使用十秒门控缓存', async () => {
  let callCount = 0;
  const task = async () => { callCount += 1; };
  await pageRefreshGate.run('journal:guest:guest', task);
  await pageRefreshGate.run('journal:guest:guest', task, { force: true });
  assert.equal(callCount, 2);
});
