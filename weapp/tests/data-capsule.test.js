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
  },
  getSystemInfoSync() {
    return {
      platform: 'devtools',
      model: 'simulator',
      system: 'iOS 18',
      version: '8.0.0',
      SDKVersion: '3.8.0'
    };
  }
};

const localData = require('../services/local-data');
const localProfile = require('../services/local-profile');
const dataCapsule = require('../services/data-capsule');

test.beforeEach(() => {
  storage.clear();
});

test('导出数据胶囊包含本地记录、选项、资料、标注和导出时间，并排除不可导出记录', () => {
  localData.replaceRecords([
    { id: 'r1', date: '2026-07-10', type: '一序列', duration: 3600, notes: '保留' },
    { id: 'draft', date: '2026-07-10', type: '草稿', duration: 0 },
    { id: 'deleted', date: '2026-07-11', type: '一序列', duration: 1800, deleted_at: '2026-07-12T00:00:00.000Z' },
    { id: 'tutorial', date: '2026-07-12', type: '教程', duration: 1800, is_tutorial: true }
  ]);
  localData.replaceOptions([{ id: 'opt-1', label: '一序列', color_level: 3 }]);
  localProfile.saveProfile({ name: '练习者', signature: '日日练习', avatar: 'temp://avatar' });
  localData.replaceAnnotations({
    types: [{ id: 'ann-1', label: '经期', color: '#E8637A' }],
    assignments: [{ id: 'ass-1', annotation_type_id: 'ann-1', date: '2026-07-10' }]
  });

  const exported = JSON.parse(dataCapsule.exportLocalData());
  assert.deepEqual(Object.keys(exported).sort(), ['annotations', 'export_at', 'options', 'profile', 'records']);
  assert.equal(exported.records.length, 1);
  assert.equal(exported.records[0].id, 'r1');
  assert.equal(exported.options.length, 1);
  assert.equal(exported.profile.name, '练习者');
  assert.equal(exported.profile.avatar, undefined);
  assert.equal(exported.annotations.types.length, 1);
  assert.equal(typeof exported.export_at, 'string');
});

test('登录模式可用当前页面的云端记录生成胶囊，不会误导出空的游客仓库', () => {
  localData.replaceRecords([]);
  const exported = JSON.parse(dataCapsule.exportLocalData({
    records: [{ id: 'cloud-1', date: '2026-07-11', type: '一序列', duration: 5400 }],
    options: [{ id: 'cloud-option', label: '一序列', color_level: 4 }],
    profile: { name: '云端用户', avatar: 'https://example.com/avatar.jpg' }
  }));

  assert.equal(exported.records.length, 1);
  assert.equal(exported.records[0].id, 'cloud-1');
  assert.equal(exported.options[0].id, 'cloud-option');
  assert.equal(exported.profile.name, '云端用户');
  assert.equal(exported.profile.avatar, undefined);
});

test('导入合法数据胶囊会替换本地记录、选项、资料和标注，并兼容旧选项字段', () => {
  localData.replaceRecords([{ id: 'old', date: '2026-01-01', type: '旧记录', duration: 60 }]);
  localData.replaceOptions([{ id: 'old-option', label: '旧选项' }]);
  localProfile.saveProfile({ name: '旧名字' });
  localData.replaceAnnotations({ types: [{ id: 'old-ann' }], assignments: [] });

  const capsule = JSON.stringify({
    records: [
      { id: 'new-late', date: '2026-07-12', type: '半序列', duration: 1200 },
      { id: 'new-early', date: '2026-07-10', type: '一序列', duration: 3600 }
    ],
    options: [{ id: 'opt-new', label_zh: '二序列', isCustom: true, color_level: 4 }],
    profile: { name: '新名字', signature: '新签名', historical_days: 7 },
    annotations: {
      types: [{ id: 'ann-new', label: '月亮日', color: '#2DB5B5' }],
      assignments: [{ id: 'assign-new', annotation_type_id: 'ann-new', date: '2026-07-12' }]
    }
  });

  const result = dataCapsule.importLocalData(capsule);
  assert.equal(result.valid, true);
  assert.deepEqual(result.counts, {
    records: 2,
    completed_records: 2,
    options: 1,
    annotation_types: 1,
    annotation_assignments: 1
  });
  assert.deepEqual(localData.getAllRecords().map((record) => record.id), ['new-late', 'new-early']);
  assert.equal(localData.getOptions()[0].label, '二序列');
  assert.equal(localData.getOptions()[0].is_custom, true);
  assert.equal(localProfile.getProfile().name, '新名字');
  assert.equal(localData.getTypes()[0].label, '月亮日');
  assert.equal(localData.getMonthAssignments(2026, 7).length, 1);
});

test('兼容网页真实导出格式，0 秒记录会导入但不计入完成统计', () => {
  const capsule = JSON.stringify({
    records: [{
      date: '2026-05-15',
      type: '一序列',
      duration: 0,
      notes: '今日练习完成',
      id: '7d1ca750-a6ba-487c-afee-b323e83401dc',
      created_at: '2026-05-15T06:18:12.161Z',
      updated_at: '2026-05-15T06:18:13.840Z',
      photos: []
    }],
    options: [
      { id: 'opt-1', created_at: '2026-05-15T06:18:01.115Z', label: '一序列', notes: 'Mysore', is_custom: false },
      { id: 'opt-2', created_at: '2026-05-15T06:18:01.115Z', label: '半序列', notes: '站立+休息', is_custom: false }
    ],
    profile: { id: '', name: '阿斯汤加习练者', signature: '练习、练习，一切随之而来。' },
    export_at: '2026-07-11T07:55:26.270Z'
  });

  const result = dataCapsule.importLocalData(capsule);
  assert.equal(result.valid, true);
  assert.equal(result.counts.records, 1);
  assert.equal(result.counts.completed_records, 0);
  assert.equal(localData.getAllRecords()[0].id, '7d1ca750-a6ba-487c-afee-b323e83401dc');
  assert.equal(localData.getOptions().length, 2);
  assert.equal(localProfile.getProfile().name, '阿斯汤加习练者');
});

test('导入非法 JSON 返回错误且不修改本地数据', () => {
  localData.replaceRecords([{ id: 'safe', date: '2026-07-10', type: '一序列', duration: 3600 }]);
  const result = dataCapsule.importLocalData('{bad');
  assert.equal(result.valid, false);
  assert.match(result.error, /JSON/);
  assert.equal(localData.getAllRecords().length, 1);
  assert.equal(localData.getAllRecords()[0].id, 'safe');
});

test('清空本地数据后记录为空、选项恢复默认、资料恢复默认、标注为空', () => {
  localData.replaceRecords([{ id: 'r1', date: '2026-07-10', type: '一序列', duration: 3600 }]);
  localData.replaceOptions([{ id: 'custom', label: '自定义' }]);
  localProfile.saveProfile({ name: '待清空', historical_days: 99 });
  localData.replaceAnnotations({
    types: [{ id: 'ann-1', label: '标注' }],
    assignments: [{ id: 'a-1', annotation_type_id: 'ann-1', date: '2026-07-10' }]
  });

  dataCapsule.clearLocalData();
  assert.equal(localData.getAllRecords().length, 0);
  assert.deepEqual(localData.getOptions().map((option) => option.label), ['一序列', '半序列']);
  assert.equal(localProfile.getProfile().name, localProfile.DEFAULT_PROFILE.name);
  assert.equal(localProfile.getProfile().historical_days, 0);
  assert.equal(localData.getTypes().length, 0);
  assert.equal(localData.getMonthAssignments(2026, 7).length, 0);
});

test('运行日志生成 JSON，并包含模式、设备和数据统计', () => {
  localData.replaceRecords([{ id: 'r1', date: '2026-07-10', type: '一序列', duration: 3600 }]);
  const log = JSON.parse(dataCapsule.buildDebugLog({ dataMode: 'guest', activeSettingsTab: 'data' }));
  assert.equal(log.mode, 'guest');
  assert.equal(log.counts.records_total, 1);
  assert.equal(log.counts.records_active, 1);
  assert.equal(log.counts.options, 2);
  assert.equal(log.system.platform, 'devtools');
  assert.equal(log.page_state.activeSettingsTab, 'data');
  assert.equal(log.log_schema_version, 3);
  assert.equal(log._meta.version, '3.0-weapp');
  assert.equal(log._meta.platform, 'wechat-miniprogram');
  assert.ok(log.diagnostic_summary);
  assert.ok(Array.isArray(log.diagnostic_flags));
  assert.ok(Array.isArray(log.recent_events));
  assert.equal(log.records_snapshot.all.length, 1);
  assert.equal(log.records_snapshot.all[0].id, 'r1');
  assert.ok(log.auth_diagnostics);
  assert.ok(log.sync_diagnostics);
  assert.ok(log.membership_diagnostics);
  assert.ok(log.runtime_sections);
  assert.equal(Object.prototype.hasOwnProperty.call(log, 'user_email'), false);
});
