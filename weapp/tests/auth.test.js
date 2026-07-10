const test = require('node:test');
const assert = require('node:assert/strict');

const storage = new Map();
const responses = [];

global.wx = {
  request(options) {
    const next = responses.shift();
    if (!next) {
      throw new Error(`Unexpected request: ${options.method || 'GET'} ${options.url}`);
    }
    next(options);
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

function session(overrides = {}) {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    user: { id: 'user-1', email: 'test@example.com' },
    ...overrides
  };
}

test.beforeEach(() => {
  storage.clear();
  responses.length = 0;
});

test('邮箱密码登录保存真实 Supabase session', async () => {
  responses.push((options) => {
    assert.match(options.url, /grant_type=password$/);
    assert.equal(options.header.apikey.length > 0, true);
    assert.deepEqual(options.data, {
      email: 'test@example.com',
      password: 'password123'
    });
    options.success({ statusCode: 200, data: session() });
  });

  const result = await auth.signInWithPassword('test@example.com', 'password123');

  assert.equal(result.user.id, 'user-1');
  assert.equal(auth.getStoredSession().access_token, 'access-token');
  assert.equal(storage.has('auth_token'), false);
});

test('临近过期时刷新并保存轮换后的 refresh token', async () => {
  storage.set(auth.SESSION_KEY, {
    access_token: 'old-access',
    refresh_token: 'old-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 10,
    user: { id: 'user-1' }
  });

  responses.push((options) => {
    assert.match(options.url, /grant_type=refresh_token$/);
    assert.equal(options.data.refresh_token, 'old-refresh');
    options.success({
      statusCode: 200,
      data: session({
        access_token: 'new-access',
        refresh_token: 'new-refresh'
      })
    });
  });

  const result = await auth.getValidSession();

  assert.equal(result.access_token, 'new-access');
  assert.equal(auth.getStoredSession().refresh_token, 'new-refresh');
});

test('用户查询携带 anon key 和 Bearer token', async () => {
  storage.set(auth.SESSION_KEY, {
    access_token: 'valid-access',
    refresh_token: 'valid-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: null
  });

  responses.push((options) => {
    assert.match(options.url, /\/auth\/v1\/user$/);
    assert.equal(options.header.Authorization, 'Bearer valid-access');
    assert.equal(options.header.apikey.length > 0, true);
    options.success({
      statusCode: 200,
      data: { id: 'user-1', email: 'test@example.com' }
    });
  });

  const user = await auth.getCurrentUser();

  assert.equal(user.id, 'user-1');
  assert.equal(auth.getStoredSession().user.email, 'test@example.com');
});

test('Supabase 返回 session_id 不存在的 403 时自动刷新并恢复', async () => {
  storage.set(auth.SESSION_KEY, {
    access_token: 'stale-access',
    refresh_token: 'valid-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'user-1' }
  });

  responses.push((options) => {
    assert.equal(options.header.Authorization, 'Bearer stale-access');
    options.success({
      statusCode: 403,
      data: {
        message: 'Session from session_id claim in JWT does not exist'
      }
    });
  });
  responses.push((options) => {
    assert.match(options.url, /grant_type=refresh_token$/);
    assert.equal(options.data.refresh_token, 'valid-refresh');
    options.success({
      statusCode: 200,
      data: session({
        access_token: 'recovered-access',
        refresh_token: 'rotated-refresh'
      })
    });
  });
  responses.push((options) => {
    assert.equal(options.header.Authorization, 'Bearer recovered-access');
    options.success({
      statusCode: 200,
      data: { id: 'user-1', email: 'test@example.com' }
    });
  });

  const user = await auth.getCurrentUser();

  assert.equal(user.id, 'user-1');
  assert.equal(auth.getStoredSession().access_token, 'recovered-access');
  assert.equal(auth.getStoredSession().refresh_token, 'rotated-refresh');
});

test('退出时即使远端失败也清理本地会话和旧探针 token', async () => {
  storage.set(auth.SESSION_KEY, {
    access_token: 'valid-access',
    refresh_token: 'valid-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600
  });
  storage.set('auth_token', 'test-token');
  storage.set('user_info', { nickname: '测试用户' });

  responses.push((options) => {
    options.fail({ errMsg: 'request:fail offline' });
  });

  await assert.rejects(auth.signOut(), /offline/);
  assert.equal(auth.getStoredSession(), null);
  assert.equal(storage.has('auth_token'), false);
  assert.equal(storage.has('user_info'), false);
});
