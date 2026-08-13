const test = require('node:test');
const assert = require('node:assert/strict');

const storage = new Map();
let responder = null;

global.getCurrentPages = () => [{ route: 'pages/practice/practice' }];
global.wx = {
  request(options) {
    if (!responder) throw new Error('missing request responder');
    responder(options);
  },
  getStorageSync(key) { return storage.get(key); },
  setStorageSync(key, value) { storage.set(key, value); },
  removeStorageSync(key) { storage.delete(key); }
};

const runtimeErrors = require('../services/runtime-errors');
const { request } = require('../utils/request');

test.beforeEach(() => {
  storage.clear();
  runtimeErrors.clearRuntimeErrors();
  runtimeErrors.clearRuntimeEvents();
  responder = null;
});

test('成功请求记录接口、状态、耗时和服务端 Request-ID，但不记录查询密钥', async () => {
  responder = (options) => options.success({
    statusCode: 200,
    data: { success: true },
    header: { 'X-Request-ID': 'server-trace-1', 'Server-Timing': 'auth;dur=12.3, profile;dur=5.0' }
  });

  await request({
    url: 'https://ash.ashtangalife.online/api/stats/today?token=very-secret',
    method: 'GET'
  });

  const event = runtimeErrors.getRecentEvents(1)[0];
  assert.equal(event.category, 'network');
  assert.equal(event.name, 'request_completed');
  assert.equal(event.details.status_code, 200);
  assert.equal(event.details.response_request_id, 'server-trace-1');
  assert.equal(event.details.server_timing, 'auth;dur=12.3, profile;dur=5.0');
  assert.equal(event.details.target, 'https://ash.ashtangalife.online/api/stats/today');
  assert.doesNotMatch(JSON.stringify(event), /very-secret/);
});

test('超时请求保留接口和耗时诊断，同时继续向业务层抛错', async () => {
  responder = (options) => options.fail({ errMsg: 'request:fail timeout', errno: 5 });

  await assert.rejects(
    request({ url: 'https://ash.ashtangalife.online/api/membership/status?code=123456' }),
    /timeout/
  );

  const error = runtimeErrors.getRecentErrors(1)[0];
  const event = runtimeErrors.getRecentEvents(1)[0];
  assert.equal(error.type, 'request_error');
  assert.equal(event.details.target, 'https://ash.ashtangalife.online/api/membership/status');
  assert.equal(event.details.errno, 5);
  assert.doesNotMatch(JSON.stringify([error, event]), /123456/);
});
