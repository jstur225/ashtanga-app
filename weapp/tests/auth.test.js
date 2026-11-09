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
const membership = require('../services/membership');

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
    assert.match(options.url, /\/api\/auth\/login$/);
    assert.equal(options.data.email, 'test@example.com');
    assert.equal(options.data.password, 'password123');
    assert.match(options.data.diagnostic_attempt_id, /^auth-/);
    assert.equal(typeof options.data.diagnostic_nonce, 'string');
    assert.match(options.data.diagnostic_probe, /^[a-f0-9]{16}$/);
    options.success({
      statusCode: 200,
      data: { ...session(), diagnostics: { credential_transport_match: true } }
    });
  });

  const result = await auth.signInWithPassword(' Test@Example.COM ', 'password123');

  assert.equal(result.user.id, 'user-1');
  assert.equal(auth.getStoredSession().access_token, 'access-token');
  assert.equal(storage.has('auth_token'), false);
});

test('邮箱密码登录保留密码原文且允许标记原生表单输入来源', async () => {
  responses.push((options) => {
    assert.match(options.url, /\/api\/auth\/login$/);
    assert.equal(options.data.email, '519216978@qq.com');
    assert.equal(options.data.password, ' Aa123456 ');
    assert.match(options.data.diagnostic_probe, /^[a-f0-9]{16}$/);
    options.success({ statusCode: 200, data: session() });
  });

  await auth.signInWithPassword(' 519216978@QQ.COM ', ' Aa123456 ', {
    inputSource: 'native_form'
  });
  assert.equal(responses.length, 0);
});

test('忘记密码三步调用真实后端接口', async () => {
  responses.push((options) => {
    assert.match(options.url, /\/api\/auth\/send-verification-code$/);
    assert.deepEqual(options.data, { email: 'test@example.com', type: 'reset_password' });
    options.success({ statusCode: 200, data: { success: true } });
  });
  responses.push((options) => {
    assert.match(options.url, /\/api\/auth\/verify-code$/);
    assert.deepEqual(options.data, {
      email: 'test@example.com',
      code: '123456',
      type: 'reset_password'
    });
    options.success({ statusCode: 200, data: { success: true } });
  });
  responses.push((options) => {
    assert.match(options.url, /\/api\/auth\/reset-password$/);
    assert.deepEqual(options.data, {
      email: 'test@example.com',
      newPassword: 'newPassword123',
      code: '123456'
    });
    options.success({ statusCode: 200, data: { success: true } });
  });

  await auth.sendResetCode(' Test@Example.COM ');
  await auth.verifyResetCode(' Test@Example.COM ', '123456');
  await auth.resetPassword(' Test@Example.COM ', 'newPassword123', '123456');
  assert.equal(responses.length, 0);
});

test('注册验证码、注册和自动登录复用同一个小写邮箱', async () => {
  assert.equal(auth.normalizeEmail(' Test@Example.COM '), 'test@example.com');

  responses.push((options) => {
    assert.match(options.url, /\/api\/auth\/send-verification-code$/);
    assert.deepEqual(options.data, { email: 'test@example.com', type: 'email_verification' });
    options.success({ statusCode: 200, data: { success: true } });
  });
  responses.push((options) => {
    assert.match(options.url, /\/api\/auth\/register$/);
    assert.deepEqual(options.data, {
      email: 'test@example.com',
      password: 'password123',
      verificationCode: '123456'
    });
    options.success({ statusCode: 200, data: { success: true } });
  });
  responses.push((options) => {
    assert.match(options.url, /\/api\/auth\/login$/);
    assert.equal(options.data.email, 'test@example.com');
    assert.equal(options.data.password, 'password123');
    options.success({ statusCode: 200, data: session() });
  });

  await auth.sendRegisterCode(' Test@Example.COM ');
  await auth.registerWithEmail(' Test@Example.COM ', 'password123', '123456');
  assert.equal(responses.length, 0);
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
    assert.equal(options.header.Authorization, `Bearer ${options.header.apikey}`);
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

test('登录态修改密码先验证当前密码再更新 Supabase 用户', async () => {
  responses.push((options) => {
    assert.match(options.url, /\/api\/auth\/login$/);
    assert.equal(options.data.email, 'test@example.com');
    assert.equal(options.data.password, 'oldPassword123');
    options.success({ statusCode: 200, data: session() });
  });
  responses.push((options) => {
    assert.match(options.url, /\/auth\/v1\/user$/);
    assert.equal(options.method, 'PUT');
    assert.equal(options.header.Authorization, 'Bearer access-token');
    assert.deepEqual(options.data, { password: 'newPassword123' });
    options.success({ statusCode: 200, data: { id: 'user-1', email: 'test@example.com' } });
  });

  const result = await auth.changePassword(' Test@Example.COM ', 'oldPassword123', 'newPassword123');
  assert.equal(result.id, 'user-1');
  assert.equal(responses.length, 0);
});

test('会员状态接口携带有效会话并规范化 31 天试用信息', async () => {
  storage.set(auth.SESSION_KEY, {
    access_token: 'valid-access',
    refresh_token: 'valid-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'user-1', email: 'test@example.com' }
  });

  responses.push((options) => {
    assert.match(options.url, /\/api\/membership\/status$/);
    assert.equal(options.method, 'GET');
    assert.equal(options.header.Authorization, 'Bearer valid-access');
    options.success({
      statusCode: 200,
      data: {
        success: true,
        data: {
          is_active: true,
          expires_at: '2026-08-16T03:47:44.644Z',
          expires_at_formatted: '2026.08.16',
          days_remaining: 31,
          type: 'trial'
        }
      }
    });
  });

  const status = await membership.getMembershipStatus();

  assert.equal(status.is_active, true);
  assert.equal(status.type, 'trial');
  assert.equal(status.days_remaining, 31);
  assert.equal(status.expires_at_formatted, '2026.08.16');

  responses.push((options) => {
    options.fail({ errMsg: 'request:fail offline' });
  });
  const offlineStatus = await membership.getMembershipStatus();
  assert.equal(offlineStatus.is_active, true);
  assert.equal(offlineStatus.type, 'trial');
});

test('多个页面同时读取会员状态时只发送一个真实请求', async () => {
  storage.set(auth.SESSION_KEY, {
    access_token: 'valid-access',
    refresh_token: 'valid-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'user-1', email: 'test@example.com' }
  });
  let requestCount = 0;
  responses.push((options) => {
    requestCount += 1;
    setTimeout(() => options.success({
      statusCode: 200,
      data: { success: true, data: { is_active: true, days_remaining: 12, type: 'paid' } }
    }), 5);
  });
  const statuses = await Promise.all([
    membership.getMembershipStatus(),
    membership.getMembershipStatus(),
    membership.getMembershipStatus()
  ]);
  assert.equal(requestCount, 1);
  assert.deepEqual(statuses.map((item) => item.days_remaining), [12, 12, 12]);
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
test('会员状态在短时间跨 Tab 顺序读取时使用缓存，付款后可强制刷新', async () => {
  storage.set(auth.SESSION_KEY, {
    access_token: 'valid-access',
    refresh_token: 'valid-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'membership-cache-user', email: 'cache@example.com' }
  });
  let requestCount = 0;
  responses.push((options) => {
    requestCount += 1;
    options.success({
      statusCode: 200,
      data: { success: true, data: { is_active: true, days_remaining: 30, type: 'trial' } }
    });
  });

  const first = await membership.getMembershipStatus();
  const cached = await membership.getMembershipStatus();

  assert.equal(first.days_remaining, 30);
  assert.equal(cached.days_remaining, 30);
  assert.equal(requestCount, 1);

  responses.push((options) => {
    requestCount += 1;
    options.success({
      statusCode: 200,
      data: { success: true, data: { is_active: true, days_remaining: 120, type: 'quarter' } }
    });
  });
  const refreshed = await membership.getMembershipStatus({ force: true });
  assert.equal(refreshed.days_remaining, 120);
  assert.equal(requestCount, 2);
});
