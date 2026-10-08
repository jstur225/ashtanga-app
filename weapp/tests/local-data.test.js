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

test('首次游客仓库为空时创建与网页版一致的教程觉察笔记', () => {
  const tutorial = localData.ensureTutorialRecord();
  assert.equal(tutorial.is_tutorial, true);
  assert.equal(tutorial.type, '一序列 Mysore');
  assert.equal(tutorial.duration, 5400);
  assert.match(tutorial.notes, /点击左侧日期区域，可编辑或删除记录/);
  assert.match(tutorial.notes, /Mysore，让我们找回到自我的锚点/);
  assert.match(tutorial.date, /^\d{4}-\d{2}-01$/);
  assert.equal(localData.ensureTutorialRecord().id, tutorial.id);
  assert.equal(localData.getAllRecords().length, 1);
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
  assert.equal(updated.color_level, 3);
});

test('游客不能新增照片，必须先绑定邮箱账号', async () => {
  await assert.rejects(
    () => repository.createRecord({
      date: '2026-07-09',
      type: '一序列',
      duration: 3600,
      photos: ['wxfile://tmp/guest-photo.jpg']
    }),
    /绑定邮箱账号后才能使用照片功能/
  );
});

test('游客历史照片可保留和删除，但不能继续新增', async () => {
  const existing = {
    id: 'legacy-pro-record',
    date: '2026-07-09',
    type: '一序列',
    duration: 3600,
    notes: '原 Pro 记录',
    color_level: 3,
    photos: ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'],
    created_at: '2026-07-09T06:00:00.000Z',
    updated_at: '2026-07-09T06:00:00.000Z',
    deleted_at: null,
    sync_state: 'local'
  };
  localData.replaceRecords([existing]);

  const preserved = await repository.updateRecord(existing.id, {
    notes: '只改笔记',
    photos: existing.photos
  });
  assert.deepEqual(preserved.photos, existing.photos);

  await assert.rejects(
    () => repository.updateRecord(existing.id, {
      photos: [...existing.photos, 'https://cdn.example/3.jpg']
    }),
    /绑定邮箱账号后才能使用照片功能/
  );
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
