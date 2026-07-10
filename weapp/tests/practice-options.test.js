const test = require('node:test');
const assert = require('node:assert/strict');

const storage = new Map();
let requestCount = 0;

global.wx = {
  request(options) {
    requestCount += 1;
    if (options.url.includes('/rest/v1/practice_options')) {
      assert.equal(options.header.Authorization, 'Bearer access-token');
      assert.match(options.url, /select=id,label,notes,is_custom,color_level,created_at/);
      options.success({
        statusCode: 200,
        data: [{
          id: 'option-1',
          label: '一序列',
          notes: 'Mysore',
          is_custom: false,
          color_level: 3
        }]
      });
      return;
    }

    assert.match(options.url, /\/api\/stats\/today$/);
    options.success({
      statusCode: 200,
      data: { count: 39 }
    });
  },
  getStorageSync(key) {
    return storage.get(key);
  },
  setStorageSync(key, value) {
    storage.set(key, value);
  },
  removeStorageSync(key) {
    storage.delete(key);
  }
};

const auth = require('../services/auth');
const options = require('../services/practice-options');

test.beforeEach(() => {
  requestCount = 0;
  storage.clear();
  storage.set(auth.SESSION_KEY, {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'user-1' }
  });
});

test('读取真实练习选项并使用 RLS 会话', async () => {
  const result = await options.getPracticeOptions();
  assert.equal(result.length, 1);
  assert.equal(result[0].notes, 'Mysore');
});

test('读取今日练习人数公开接口', async () => {
  const result = await options.getTodayPracticeCount();
  assert.equal(result, 39);
  assert.equal(requestCount, 1);
});
