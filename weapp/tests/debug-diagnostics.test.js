const assert = require('node:assert/strict');
const test = require('node:test');

const storage = new Map();

global.wx = {
  env: { USER_DATA_PATH: '/user-data' },
  getStorageSync(key) { return storage.get(key); },
  setStorageSync(key, value) { storage.set(key, value); },
  removeStorageSync(key) { storage.delete(key); },
  getStorageInfoSync() {
    return { keys: Array.from(storage.keys()), currentSize: 32, limitSize: 10240 };
  },
  getSystemInfoSync() {
    return { platform: 'android', model: 'PLR110', system: 'Android 16', version: '8.0.74', SDKVersion: '3.17.0' };
  },
  getFileSystemManager() {
    return {
      stat(options) {
        options.success({ stats: { size: 2048 } });
      }
    };
  },
  request(options) {
    if (options.method === 'HEAD') {
      options.success({
        statusCode: 200,
        header: { 'content-length': '4096', 'content-type': 'image/jpeg', etag: 'photo-etag' }
      });
      return;
    }
    if (/\/api\/membership\/status$/.test(options.url)) {
      options.success({
        statusCode: 200,
        data: { success: true, data: { is_active: true, days_remaining: 31, type: 'trial' } },
        header: {}
      });
      return;
    }
    if (/\/rest\/v1\/practice_records\?/.test(options.url)) {
      options.success({
        statusCode: 200,
        data: [{
          id: 'record-1',
          user_id: 'user-v3',
          date: '2026-08-12',
          type: '一序列',
          duration: 5400,
          notes: '云端旧笔记',
          breakthrough: '第一次完成',
          color_level: 4,
          photos: ['https://oss.example.com/photo.jpg?token=secret'],
          created_at: '2026-08-12T01:00:00.000Z',
          updated_at: '2026-08-12T01:30:00.000Z',
          deleted_at: null
        }],
        header: {}
      });
      return;
    }
    if (/\/rest\/v1\/practice_options\?/.test(options.url)) {
      options.success({ statusCode: 200, data: [{ id: 'option-1', label: '一序列', color_level: 4 }], header: {} });
      return;
    }
    if (/\/rest\/v1\/user_profiles\?/.test(options.url)) {
      options.success({ statusCode: 200, data: [{ id: 'profile-1', name: '测试者' }], header: {} });
      return;
    }
    if (/\/api\/annotations\/types$/.test(options.url)) {
      options.success({ statusCode: 200, data: { success: true, data: [{ id: 'type-1', label: '经期' }] }, header: {} });
      return;
    }
    if (/\/api\/annotations\/assignments\?month=2026-08/.test(options.url)) {
      options.success({ statusCode: 200, data: { success: true, data: [] }, header: {} });
      return;
    }
    throw new Error(`Unexpected request: ${options.method} ${options.url}`);
  }
};

global.getCurrentPages = () => [{ route: 'pages/profile/profile' }];

const auth = require('../services/auth');
const accountWorkspace = require('../services/account-workspace');
const dataCapsule = require('../services/data-capsule');

test.beforeEach(() => storage.clear());

test('V3 完整日志包含全部记录、合并冲突、登录、会员和逐张照片诊断', async () => {
  const userId = 'user-v3';
  storage.set(auth.SESSION_KEY, {
    access_token: 'secret-access-token',
    refresh_token: 'secret-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: userId,
      email: 'zaohezi2020@gmail.com',
      created_at: '2026-07-01T00:00:00.000Z',
      last_sign_in_at: '2026-08-12T00:00:00.000Z'
    }
  });
  storage.set('weapp_account_mode_enabled', true);
  storage.set(accountWorkspace.getWorkspaceKey(userId), {
    version: 1,
    account_id: userId,
    records: [{
      id: 'record-1',
      user_id: userId,
      date: '2026-08-12',
      type: '一序列',
      duration: 5400,
      notes: '完整觉察笔记',
      breakthrough: '第一次完成',
      color_level: 4,
      photos: ['https://oss.example.com/photo.jpg?token=secret', '/user-data/local.jpg'],
      created_at: '2026-08-12T01:00:00.000Z',
      updated_at: '2026-08-12T02:00:00.000Z',
      sync_state: 'pending'
    }],
    options: [{ id: 'option-1', label: '一序列', color_level: 4, is_custom: false }],
    profile: { name: '测试者', signature: '练习', sync_state: 'synced' },
    annotations: { types: [{ id: 'type-1', label: '经期', color: '#E8637A' }], assignments: [] },
    pending_operations: [{
      id: 'operation-1',
      entity: 'record',
      action: 'update',
      record_id: 'record-1',
      payload: { notes: '完整觉察笔记', password: 'must-not-export' },
      attempts: 1,
      last_error: '上次同步失败',
      created_at: '2026-08-12T02:01:00.000Z'
    }],
    cached_ranges: ['2026-01-01:2026-12-31'],
    cached_annotation_months: ['2026-08'],
    options_cached: true,
    profile_cached: true,
    sync_logs: [{
      at: '2026-08-12T02:02:00.000Z',
      stage: 'conflict',
      status: 'resolved',
      action: 'keep_local',
      entity_id: 'record-1',
      message: '保留本机较新版本'
    }],
    last_sync_at: '2026-08-12T02:02:00.000Z',
    last_sync_status: 'pending'
  });

  const logText = await dataCapsule.collectDebugLog({
    dataMode: 'cloud',
    isPro: true,
    membershipType: 'trial'
  });
  const log = JSON.parse(logText);

  assert.equal(log._meta.version, '3.0-weapp');
  assert.equal(log._meta.diagnostics, 'full');
  assert.equal(log.records_snapshot.all.length, 1);
  assert.equal(log.records_snapshot.all[0].notes, '完整觉察笔记');
  assert.equal(log.records_snapshot.all[0].photos_count, 2);
  assert.equal(log.options_snapshot.all[0].color_level, 4);
  assert.equal(log.sync_diagnostics.pending_operations.length, 1);
  assert.equal(log.sync_diagnostics.pending_operations[0].payload.password, '[redacted]');
  assert.equal(log.sync_diagnostics.conflict_logs.length, 1);
  assert.equal(log.auth_diagnostics.user.email, '[email]');
  assert.equal(log.auth_diagnostics.access_token_present, true);
  assert.equal(log.membership_diagnostics.current_server_or_cache_status.days_remaining, 31);
  assert.equal(log.photo_diagnostics.all_references.length, 2);
  assert.equal(log.photo_diagnostics.health_checks.length, 2);
  assert.equal(log.photo_diagnostics.summary.problems, 0);
  assert.equal(log.cloud_diagnostics.available, true);
  assert.equal(log.cloud_diagnostics.records.length, 1);
  assert.equal(log.cloud_diagnostics.merge_comparison.summary.divergent, 1);
  assert.deepEqual(
    log.cloud_diagnostics.merge_comparison.rows[0].changed_fields.sort(),
    ['notes', 'photos']
  );
  assert.doesNotMatch(logText, /secret-access-token|secret-refresh-token|must-not-export|token=secret/);
});
