const test = require('node:test');
const assert = require('node:assert/strict');

const storage = new Map();

global.wx = {
  request(options) {
    assert.match(options.url, /\/rest\/v1\/practice_records/);
    assert.equal(options.header.Authorization, 'Bearer access-token');
    assert.equal(options.header.apikey.length > 0, true);

    if (options.method === 'POST') {
      assert.equal(options.header.Prefer, 'return=representation');
      assert.equal(options.data.user_id, 'user-1');
      options.success({ statusCode: 201, data: [options.data] });
      return;
    }

    if (options.method === 'PATCH') {
      assert.match(options.url, /id=eq\.record-1/);
      if (options.data.deleted_at) {
        assert.equal(options.header.Prefer, 'return=minimal');
        options.success({ statusCode: 204, data: '' });
      } else {
        assert.equal(options.header.Prefer, 'return=representation');
        options.success({
          statusCode: 200,
          data: [{ id: 'record-1', ...options.data }]
        });
      }
      return;
    }

    assert.match(options.url, /\?/);
    assert.match(options.url, /deleted_at=is\.null/);
    if (options.url.includes('date=gte.')) {
      assert.match(options.url, /date=gte\.2026-07-01/);
      assert.match(options.url, /date=lte\.2026-07-31/);
      assert.match(options.url, /order=date\.asc,created_at\.asc/);
    } else {
      assert.match(options.url, /order=date\.desc,created_at\.desc/);
      assert.match(options.url, /limit=10/);
    }
    options.success({
      statusCode: 200,
      data: [{
        id: 'record-1',
        date: '2026-07-09',
        type: '一序列',
        duration: 5400
      }]
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
const records = require('../services/practice-records');

test.beforeEach(() => {
  storage.clear();
  storage.set(auth.SESSION_KEY, {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'user-1' }
  });
});

test('使用真实会话和 RLS 读取最近未删除记录', async () => {
  const result = await records.getRecentRecords(10);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'record-1');
});

test('按日期范围读取月历记录', async () => {
  const result = await records.getRecordsByDateRange('2026-07-01', '2026-07-31');
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-07-09');
});

test('创建记录时写入当前用户、色阶和返回数据', async () => {
  const result = await records.createRecord({
    date: '2026-07-09',
    type: '一序列',
    duration: 3600,
    notes: '稳定',
    color_level: 4
  });
  assert.equal(result.user_id, 'user-1');
  assert.equal(result.type, '一序列');
  assert.equal(result.color_level, 4);
});

test('更新记录只提交允许字段', async () => {
  const result = await records.updateRecord('record-1', {
    notes: '更新后的觉察',
    color_level: 2,
    user_id: 'other-user'
  });
  assert.equal(result.notes, '更新后的觉察');
  assert.equal(result.color_level, 2);
  assert.equal(result.user_id, undefined);
});

test('删除记录使用软删除字段', async () => {
  const result = await records.softDeleteRecord('record-1');
  assert.equal(result, true);
});
