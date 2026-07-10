const test = require('node:test');
const assert = require('node:assert/strict');

const storage = new Map();

global.wx = {
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
const localData = require('../services/local-data');
const repository = require('../services/data-repository');

test.beforeEach(() => {
  storage.clear();
});

test('未登录时仓库使用游客模式和默认选项', async () => {
  assert.equal(repository.getMode(), 'guest');
  const options = await repository.getPracticeOptions();
  assert.deepEqual(options.map((option) => option.label), ['一序列', '半序列']);
  assert.equal(storage.has(localData.OPTIONS_KEY), true);
});

test('游客可以补足第三个练习类型，超过三个时拒绝', async () => {
  const added = await repository.addPracticeOption({
    label: '二序列',
    notes: '入门',
    color_level: 4
  });
  assert.equal(added.label, '二序列');
  assert.equal((await repository.getPracticeOptions()).length, 3);
  await assert.rejects(
    () => repository.addPracticeOption({ label: '基础练习' }),
    /最多保留 3 个/
  );
});

test('游客记录可以新增、按月读取和编辑', async () => {
  const created = await repository.createRecord({
    date: '2026-07-09',
    type: '一序列',
    duration: 3600,
    notes: '游客练习',
    color_level: 4,
    start_time: '2026-07-09T06:00:00.000Z'
  });
  assert.equal(created.sync_state, 'local');
  assert.equal(created.start_time, '2026-07-09T06:00:00.000Z');
  assert.equal(repository.getGuestRecordCount(), 1);

  const julyRecords = await repository.getRecordsByDateRange('2026-07-01', '2026-07-31');
  assert.equal(julyRecords.length, 1);
  assert.equal(julyRecords[0].notes, '游客练习');

  const updated = await repository.updateRecord(created.id, {
    notes: '更新后的游客练习',
    color_level: 2
  });
  assert.equal(updated.notes, '更新后的游客练习');
  assert.equal(updated.color_level, 2);
});

test('游客软删除后不再出现在月历，但保留删除标记', async () => {
  const created = await repository.createRecord({
    date: '2026-07-09',
    type: '半序列',
    duration: 1800
  });
  await repository.softDeleteRecord(created.id);

  const visible = await repository.getRecordsByDateRange('2026-07-01', '2026-07-31');
  assert.equal(visible.length, 0);
  assert.equal(repository.getGuestRecordCount(), 0);
  assert.equal(Boolean(localData.getAllRecords()[0].deleted_at), true);
});

test('存在真实 session 且明确进入账号模式时仓库识别为云端模式', () => {
  storage.set(auth.SESSION_KEY, {
    user: { id: 'user-1' },
    access_token: 'token',
    refresh_token: 'refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600
  });
  storage.set('weapp_account_mode_enabled', true);
  assert.equal(repository.getMode(), 'cloud');
});

test('仅有历史 session 时仍默认进入游客模式，避免阻塞纯本地测试', async () => {
  storage.set(auth.SESSION_KEY, {
    user: { id: 'user-1' },
    access_token: 'token',
    refresh_token: 'refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600
  });

  assert.equal(repository.getMode(), 'guest');
  const options = await repository.getPracticeOptions();
  assert.deepEqual(options.map((option) => option.label), ['一序列', '半序列']);
});

test('游客模式开关优先于历史登录 session，方便纯本地测试', async () => {
  storage.set(auth.SESSION_KEY, {
    user: { id: 'user-1' },
    access_token: 'token',
    refresh_token: 'refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600
  });
  storage.set('weapp_account_mode_enabled', true);
  storage.set('weapp_guest_mode_enabled', true);

  assert.equal(repository.getMode(), 'guest');
  const options = await repository.getPracticeOptions();
  assert.deepEqual(options.map((option) => option.label), ['一序列', '半序列']);
});
