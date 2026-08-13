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
const workspace = require('../services/account-workspace');
const cloudRecords = require('../services/practice-records');
const cloudOptions = require('../services/practice-options');
const cloudProfile = require('../services/user-profile');
const cloudAnnotations = require('../services/cloud-annotations');
const photoStorage = require('../services/photo-storage');
const localData = require('../services/local-data');
const dataCapsule = require('../services/data-capsule');
const repository = require('../services/data-repository');

const originalGetRecords = cloudRecords.getRecordsByDateRange;
const originalGetRecordById = cloudRecords.getRecordById;
const originalGetOptions = cloudOptions.getPracticeOptions;
const originalCreateRecord = cloudRecords.createRecord;
const originalUpdateRecord = cloudRecords.updateRecord;
const originalDeleteRecord = cloudRecords.softDeleteRecord;
const originalCreateOption = cloudOptions.createPracticeOption;
const originalUpdateOption = cloudOptions.updatePracticeOption;
const originalDeleteOption = cloudOptions.deletePracticeOption;
const originalGetProfile = cloudProfile.getUserProfile;
const originalSaveProfile = cloudProfile.saveUserProfile;
const originalGetAnnotationTypes = cloudAnnotations.getTypes;
const originalCreateAnnotationType = cloudAnnotations.createType;
const originalAddAssignment = cloudAnnotations.addAssignment;
const originalPersistPhotos = photoStorage.persistPhotos;
const originalPersistPhoto = photoStorage.persistPhoto;
const originalValidatePhotoSize = photoStorage.validatePhotoSize;
const originalUploadPhoto = photoStorage.uploadPhoto;
const originalRemoveLocalPhoto = photoStorage.removeLocalPhoto;

function enableAccount(accountId, userOverrides = {}) {
  storage.set(auth.SESSION_KEY, {
    user: { id: accountId, ...userOverrides },
    access_token: 'token',
    refresh_token: 'refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600
  });
  storage.set('weapp_account_mode_enabled', true);
}

test.beforeEach(() => {
  storage.clear();
  repository.invalidateSharedReads();
  cloudRecords.getRecordsByDateRange = originalGetRecords;
  cloudRecords.getRecordById = originalGetRecordById;
  cloudOptions.getPracticeOptions = originalGetOptions;
  cloudRecords.createRecord = originalCreateRecord;
  cloudRecords.updateRecord = originalUpdateRecord;
  cloudRecords.softDeleteRecord = originalDeleteRecord;
  cloudOptions.createPracticeOption = originalCreateOption;
  cloudOptions.updatePracticeOption = originalUpdateOption;
  cloudOptions.deletePracticeOption = originalDeleteOption;
  cloudProfile.getUserProfile = originalGetProfile;
  cloudProfile.saveUserProfile = originalSaveProfile;
  cloudAnnotations.getTypes = originalGetAnnotationTypes;
  cloudAnnotations.createType = originalCreateAnnotationType;
  cloudAnnotations.addAssignment = originalAddAssignment;
  photoStorage.persistPhotos = originalPersistPhotos;
  photoStorage.persistPhoto = originalPersistPhoto;
  photoStorage.validatePhotoSize = originalValidatePhotoSize;
  photoStorage.uploadPhoto = originalUploadPhoto;
  photoStorage.removeLocalPhoto = originalRemoveLocalPhoto;
});

test('跨 Tab 在三十秒内复用相同选项和日期范围，空队列不写同步日志', async () => {
  enableAccount('shared-read-cache');
  let recordRequests = 0;
  let optionRequests = 0;
  cloudRecords.getRecordsByDateRange = async () => {
    recordRequests += 1;
    return [{ id: 'shared-record', date: '2026-08-12', type: '一序列', duration: 3600 }];
  };
  cloudOptions.getPracticeOptions = async () => {
    optionRequests += 1;
    return [{ id: 'shared-option', label: '一序列', is_custom: false }];
  };

  await repository.getRecordsByDateRange('2026-08-01', '2026-08-31');
  await repository.getPracticeOptions();
  await repository.getRecordsByDateRange('2026-08-01', '2026-08-31');
  await repository.getPracticeOptions();
  const emptySync = await repository.syncPendingRecords();

  assert.equal(recordRequests, 1);
  assert.equal(optionRequests, 1);
  assert.equal(emptySync.skipped, true);
  assert.equal(workspace.getWorkspace('shared-read-cache').sync_logs.length, 0);
});

test.after(() => {
  cloudRecords.getRecordsByDateRange = originalGetRecords;
  cloudRecords.getRecordById = originalGetRecordById;
  cloudOptions.getPracticeOptions = originalGetOptions;
  cloudRecords.createRecord = originalCreateRecord;
  cloudRecords.updateRecord = originalUpdateRecord;
  cloudRecords.softDeleteRecord = originalDeleteRecord;
  cloudOptions.createPracticeOption = originalCreateOption;
  cloudOptions.updatePracticeOption = originalUpdateOption;
  cloudOptions.deletePracticeOption = originalDeleteOption;
  cloudProfile.getUserProfile = originalGetProfile;
  cloudProfile.saveUserProfile = originalSaveProfile;
  cloudAnnotations.getTypes = originalGetAnnotationTypes;
  cloudAnnotations.createType = originalCreateAnnotationType;
  cloudAnnotations.addAssignment = originalAddAssignment;
  photoStorage.persistPhotos = originalPersistPhotos;
  photoStorage.persistPhoto = originalPersistPhoto;
  photoStorage.validatePhotoSize = originalValidatePhotoSize;
  photoStorage.uploadPhoto = originalUploadPhoto;
  photoStorage.removeLocalPhoto = originalRemoveLocalPhoto;
});

test('不同登录账号使用互相隔离的本机工作区', () => {
  workspace.replaceRecordsInRange('user-a', '2026-07-01', '2026-07-31', [
    { id: 'a-1', date: '2026-07-10', type: '一序列', duration: 3600 }
  ]);
  workspace.replaceRecordsInRange('user-b', '2026-07-01', '2026-07-31', [
    { id: 'b-1', date: '2026-07-11', type: '半序列', duration: 1800 }
  ]);

  assert.deepEqual(workspace.getRecordsByDateRange('user-a', '2026-07-01', '2026-07-31').map((item) => item.id), ['a-1']);
  assert.deepEqual(workspace.getRecordsByDateRange('user-b', '2026-07-01', '2026-07-31').map((item) => item.id), ['b-1']);
  assert.notEqual(workspace.getWorkspaceKey('user-a'), workspace.getWorkspaceKey('user-b'));
});

test('账号在线读取成功后写入 records/options 缓存', async () => {
  enableAccount('user-online');
  cloudRecords.getRecordsByDateRange = async () => [
    { id: 'cloud-1', date: '2026-07-09', type: '一序列', duration: 5400 }
  ];
  cloudOptions.getPracticeOptions = async () => [
    { id: 'option-1', label: '一序列', is_custom: false }
  ];

  const records = await repository.getRecordsByDateRange('2026-07-01', '2026-07-31');
  const options = await repository.getPracticeOptions();

  assert.equal(records[0].id, 'cloud-1');
  assert.equal(options[0].id, 'option-1');
  assert.equal(workspace.hasCachedRange('user-online', '2026-07-01', '2026-07-31'), true);
  assert.equal(workspace.hasCachedOptions('user-online'), true);
});

test('页面首屏同步读取账号缓存，不等待云端请求', () => {
  enableAccount('cache-first');
  workspace.replaceOptions('cache-first', [
    { id: 'cached-option', label: '缓存一序列', is_custom: false }
  ]);
  workspace.replaceRecordsInRange('cache-first', '2026-01-01', '2026-12-31', [
    { id: 'cached-record', date: '2026-08-12', type: '缓存一序列', duration: 3600 }
  ]);

  assert.equal(repository.getCachedPracticeOptions()[0].id, 'cached-option');
  assert.equal(repository.getCachedRecordsByDateRange('2026-01-01', '2026-12-31')[0].id, 'cached-record');
});

test('注册后教程复制到账号工作区且云端空列表不会冲掉', async () => {
  const tutorial = localData.createTutorialRecord();
  localData.replaceRecords([tutorial]);
  enableAccount('new-account');
  cloudRecords.getRecordsByDateRange = async () => [];

  const copied = repository.ensureAccountTutorialFromGuest();
  const records = await repository.getRecordsByDateRange('2026-01-01', '2026-12-31');

  assert.equal(copied.is_tutorial, true);
  assert.equal(records.length, 1);
  assert.equal(records[0].id, tutorial.id);
  assert.equal(records[0].sync_state, 'local');
  assert.equal(workspace.getPendingOperations('new-account').length, 0);
});

test('刚注册但已错过注册回调的账号会在首次读取时恢复教程', async () => {
  const tutorial = localData.createTutorialRecord();
  localData.replaceRecords([tutorial]);
  enableAccount('recent-account', { created_at: new Date().toISOString() });
  cloudRecords.getRecordsByDateRange = async () => [
    { id: 'first-real-record', date: '2026-07-16', type: '一序列', duration: 3600 }
  ];

  const records = await repository.getRecordsByDateRange('2026-01-01', '2026-12-31');

  assert.equal(records.length, 2);
  assert.equal(records.some((record) => record.is_tutorial), true);
  assert.equal(records.some((record) => record.id === 'first-real-record'), true);
  assert.equal(workspace.getPendingOperations('recent-account').length, 0);
});

test('账号内教程编辑和删除保持本机专用且不进入云同步队列', async () => {
  const tutorial = localData.createTutorialRecord();
  localData.replaceRecords([tutorial]);
  enableAccount('tutorial-local-only', { created_at: new Date().toISOString() });
  repository.ensureAccountTutorialFromGuest();
  let updateCalls = 0;
  let deleteCalls = 0;
  cloudRecords.getRecordsByDateRange = async () => [];
  cloudRecords.updateRecord = async () => { updateCalls += 1; };
  cloudRecords.softDeleteRecord = async () => { deleteCalls += 1; };

  const updated = await repository.updateRecord(tutorial.id, { notes: '更新后的教程提示' });
  await repository.softDeleteRecord(tutorial.id);

  assert.equal(updated.notes, '更新后的教程提示');
  assert.equal(updated.sync_state, 'local');
  assert.equal(updateCalls, 0);
  assert.equal(deleteCalls, 0);
  assert.equal(workspace.getPendingOperations('tutorial-local-only').length, 0);
  assert.equal(workspace.getRecord('tutorial-local-only', tutorial.id).deleted_at != null, true);
  const refreshed = await repository.getRecordsByDateRange('2026-01-01', '2026-12-31');
  assert.equal(refreshed.length, 0);
});

test('账号云端读取失败时回退该账号上次缓存', async () => {
  enableAccount('user-offline');
  workspace.replaceRecordsInRange('user-offline', '2026-07-01', '2026-07-31', [
    { id: 'cached-1', date: '2026-07-08', type: '半序列', duration: 1800 }
  ]);
  workspace.replaceOptions('user-offline', [
    { id: 'cached-option', label: '半序列', is_custom: false }
  ]);
  cloudRecords.getRecordsByDateRange = async () => {
    throw new Error('network unavailable');
  };
  cloudOptions.getPracticeOptions = async () => {
    throw new Error('network unavailable');
  };

  const records = await repository.getRecordsByDateRange('2026-07-01', '2026-07-31');
  const options = await repository.getPracticeOptions();

  assert.equal(records[0].id, 'cached-1');
  assert.equal(options[0].id, 'cached-option');
});

test('账号从未缓存过的日期范围在云端失败时仍返回错误', async () => {
  enableAccount('user-empty');
  cloudRecords.getRecordsByDateRange = async () => {
    throw new Error('network unavailable');
  };

  await assert.rejects(
    () => repository.getRecordsByDateRange('2026-06-01', '2026-06-30'),
    /network unavailable/
  );
});

test('账号新增记录先落本机，云端失败后保留 pending 并可重试', async () => {
  enableAccount('user-pending-create');
  let createCalls = 0;
  cloudRecords.createRecord = async (input) => {
    createCalls += 1;
    if (createCalls === 1) throw new Error('network unavailable');
    return { ...input, sync_state: undefined };
  };

  const localRecord = await repository.createRecord({
    date: '2026-07-15', type: '一序列', duration: 3600, notes: '离线创建'
  });
  assert.equal(localRecord.sync_state, 'pending');
  assert.equal(workspace.getPendingOperations('user-pending-create').length, 1);
  assert.equal(workspace.getRecordsByDateRange('user-pending-create', '2026-07-01', '2026-07-31').length, 1);

  const result = await repository.syncPendingRecords({ includePhotos: true });
  assert.equal(result.synced, 1);
  assert.equal(result.pending, 0);
  assert.equal(createCalls, 2);
  assert.equal(workspace.getRecord('user-pending-create', localRecord.id).sync_state, 'synced');
});

test('连续编辑同一条离线记录会合并为一个 update 操作', async () => {
  enableAccount('user-pending-update');
  workspace.upsertRecord('user-pending-update', {
    id: 'record-update', date: '2026-07-15', type: '一序列', duration: 1800, notes: '旧内容'
  });
  cloudRecords.updateRecord = async () => { throw new Error('offline'); };

  await repository.updateRecord('record-update', { notes: '第一次' });
  await repository.updateRecord('record-update', { duration: 2400, notes: '第二次' });

  const operations = workspace.getPendingOperations('user-pending-update');
  assert.equal(operations.length, 1);
  assert.equal(operations[0].action, 'update');
  assert.equal(operations[0].payload.notes, '第二次');
  assert.equal(operations[0].payload.duration, 2400);
  assert.equal(workspace.getRecord('user-pending-update', 'record-update').sync_state, 'pending');
});

test('离线删除立即从本机列表隐藏并保留 delete 操作', async () => {
  enableAccount('user-pending-delete');
  workspace.upsertRecord('user-pending-delete', {
    id: 'record-delete', date: '2026-07-15', type: '半序列', duration: 1200
  });
  cloudRecords.softDeleteRecord = async () => { throw new Error('offline'); };

  await repository.softDeleteRecord('record-delete');

  assert.equal(workspace.getRecordsByDateRange('user-pending-delete', '2026-07-01', '2026-07-31').length, 0);
  assert.equal(workspace.getPendingOperations('user-pending-delete')[0].action, 'delete');
});

test('云端读取不会覆盖仍待同步的本机记录', async () => {
  enableAccount('user-preserve-pending');
  cloudRecords.createRecord = async () => { throw new Error('write offline'); };
  const pending = await repository.createRecord({
    date: '2026-07-15', type: '一序列', duration: 3000, notes: '待同步'
  });
  cloudRecords.getRecordsByDateRange = async () => [
    { id: 'cloud-other', date: '2026-07-14', type: '半序列', duration: 1800 }
  ];

  const records = await repository.getRecordsByDateRange('2026-07-01', '2026-07-31');
  assert.deepEqual(new Set(records.map((record) => record.id)), new Set(['cloud-other', pending.id]));
  assert.equal(workspace.getPendingOperations('user-preserve-pending').length, 1);
});

test('账号练习类型本机先写，失败后与 records 共用待同步队列', async () => {
  enableAccount('user-option-sync');
  let calls = 0;
  cloudOptions.createPracticeOption = async (input) => {
    calls += 1;
    if (calls === 1) throw new Error('option offline');
    return { ...input, sync_state: undefined };
  };

  const option = await repository.addPracticeOption({ label: '自定义练习', notes: '测试', color_level: 4 });
  assert.equal(option.sync_state, 'pending');
  assert.equal(repository.getRecordSyncState().pending_by_entity.option, 1);

  const result = await repository.syncPendingRecords();
  assert.equal(result.pending, 0);
  assert.equal(workspace.getOption('user-option-sync', option.id).sync_state, 'synced');
});

test('账号资料按账号隔离保存，失败进入队列且运行日志包含错误详情', async () => {
  enableAccount('user-profile-sync');
  let calls = 0;
  cloudProfile.saveUserProfile = async (profile) => {
    calls += 1;
    if (calls === 1) throw new Error('profile upload failed');
    return profile;
  };

  const profile = await repository.saveProfile({ name: '账号昵称', signature: '账号签名', historical_days: 12 });
  assert.equal(profile.name, '账号昵称');
  assert.equal(repository.getRecordSyncState().pending_by_entity.profile, 1);
  const debug = JSON.parse(dataCapsule.buildDebugLog({ dataMode: 'cloud' }));
  assert.equal(debug.counts.pending_by_entity.profile, 1);
  assert.match(JSON.stringify(debug.recent_errors), /profile upload failed/);

  await repository.syncPendingRecords();
  assert.equal(repository.getRecordSyncState().pending, 0);
  assert.equal(workspace.getProfile('user-profile-sync').sync_state, 'synced');
});

test('账号头像随资料保存并优先读取云端头像', async () => {
  enableAccount('user-profile-avatar');
  cloudProfile.saveUserProfile = async (profile) => profile;
  await repository.saveProfile({
    name: '头像用户',
    avatar: 'https://oss.example/avatar-new.jpg'
  });
  assert.equal(workspace.getProfile('user-profile-avatar').avatar, 'https://oss.example/avatar-new.jpg');

  cloudProfile.getUserProfile = async () => ({
    name: '云端头像用户',
    signature: '云端签名',
    avatar: 'https://oss.example/avatar-cloud.jpg'
  });
  const profile = await repository.getProfile();
  assert.equal(profile.avatar, 'https://oss.example/avatar-cloud.jpg');
});

test('资料上传失败后重新读取不会被云端旧资料覆盖', async () => {
  enableAccount('user-profile-preserve');
  cloudProfile.saveUserProfile = async () => { throw new Error('profile offline'); };
  cloudProfile.getUserProfile = async () => ({ name: '云端旧昵称', signature: '旧签名' });

  await repository.saveProfile({ name: '本机新昵称', signature: '本机新签名' });
  const profile = await repository.getProfile();

  assert.equal(profile.name, '本机新昵称');
  assert.equal(workspace.getPendingOperations('user-profile-preserve').length, 1);
});

test('离线标注类型恢复同步后会把日期分配从本机 ID 重映射为云端 ID', async () => {
  enableAccount('user-annotation-sync');
  let online = false;
  let uploadedTypeId = '';
  cloudAnnotations.createType = async (label, color) => {
    if (!online) throw new Error('annotation offline');
    return { id: 'remote-type', label, color, sort_order: 0 };
  };
  cloudAnnotations.addAssignment = async (typeId) => {
    if (!online) throw new Error('annotation offline');
    uploadedTypeId = typeId;
    return { id: 'remote-assignment' };
  };

  const localType = await repository.createAnnotationType('休息日', '#D4A5A5');
  await repository.addAnnotation(localType.id, '2026-07-15');
  assert.equal(repository.getRecordSyncState().pending, 2);

  online = true;
  const result = await repository.syncPendingRecords();
  assert.equal(result.pending, 0);
  assert.equal(uploadedTypeId, 'remote-type');
  const annotations = workspace.getAnnotations('user-annotation-sync');
  assert.equal(annotations.types[0].id, 'remote-type');
  assert.equal(annotations.assignments[0].annotation_type_id, 'remote-type');
});

test('云端已有同名标注时自动复用远端 ID 并清除重复创建任务', async () => {
  enableAccount('user-annotation-duplicate');
  const duplicateError = new Error('DUPLICATE_LABEL');
  duplicateError.statusCode = 409;
  duplicateError.body = { error: 'DUPLICATE_LABEL' };
  cloudAnnotations.createType = async () => { throw duplicateError; };
  cloudAnnotations.getTypes = async () => [
    { id: 'remote-existing-type', label: '休息日', color: '#C1A268', sort_order: 0 }
  ];

  const created = await repository.createAnnotationType('休息日', '#D4A5A5');

  assert.equal(created.id, 'remote-existing-type');
  assert.equal(repository.getRecordSyncState().pending, 0);
  assert.equal(workspace.getAnnotations('user-annotation-duplicate').types[0].id, 'remote-existing-type');
  assert.match(
    workspace.getWorkspace('user-annotation-duplicate').sync_logs.map((item) => item.message).join('\n'),
    /已自动关联/
  );
});

test('缓存记录读取不发起云端请求并能立即看到刚落本机的记录', () => {
  enableAccount('user-cached-calendar');
  workspace.upsertRecord('user-cached-calendar', {
    id: 'local-record', date: '2026-07-17', type: '一序列', duration: 3600, sync_state: 'pending'
  });

  const records = repository.getCachedRecordsByDateRange('2026-07-01', '2026-07-31');

  assert.deepEqual(records.map((record) => record.id), ['local-record']);
});

test('账号记录照片先创建记录再上传 OSS，成功后本机路径替换为远端 URL', async () => {
  enableAccount('user-photo-sync');
  photoStorage.persistPhotos = async () => ['http://store/photo.jpg'];
  photoStorage.uploadPhoto = async (recordId, path) => {
    assert.ok(recordId);
    assert.equal(path, 'http://store/photo.jpg');
    return 'https://oss.example/photo.jpg';
  };
  photoStorage.removeLocalPhoto = async () => true;
  cloudRecords.createRecord = async (input) => {
    assert.deepEqual(input.photos, []);
    return { ...input, photos: [], sync_state: undefined };
  };

  const record = await repository.createRecord({
    date: '2026-07-15', type: '一序列', duration: 3600, photos: ['wxfile://tmp/photo.jpg']
  });

  assert.deepEqual(record.photos, ['http://store/photo.jpg']);
  assert.equal(repository.getRecordSyncState().pending, 1);
  assert.equal(repository.getPhotoSyncStatus(record.id, 'http://store/photo.jpg'), 'uploading');

  await repository.syncPendingRecords({ includePhotos: true });

  assert.deepEqual(
    workspace.getRecord('user-photo-sync', record.id).photos,
    ['https://oss.example/photo.jpg']
  );
  assert.equal(repository.getPhotoSyncStatus(record.id, 'https://oss.example/photo.jpg'), 'success');
  assert.equal(repository.getRecordSyncState().pending, 0);
  const logs = repository.getRecordSyncState().logs;
  assert.ok(logs.some((log) => log.stage === 'photo' && log.status === 'success'));
});

test('表单即时上传：字节到 OSS 即替换远端地址并反馈成功，元数据登记转后台', async () => {
  enableAccount('user-photo-immediate');
  workspace.upsertRecord('user-photo-immediate', {
    id: 'record-photo-immediate', date: '2026-07-17', type: '草稿', duration: 60,
    photos: [], sync_state: 'synced'
  });
  photoStorage.validatePhotoSize = async () => true;
  photoStorage.persistPhoto = async () => 'http://store/immediate.jpg';
  photoStorage.uploadPhotoToOss = async (localPath) => {
    assert.equal(localPath, 'http://store/immediate.jpg');
    return {
      ossUrl: 'https://oss.example/immediate.jpg',
      ossKey: 'user/immediate.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024
    };
  };
  let registered = 0;
  photoStorage.registerPhotoMetadata = async () => {
    registered += 1;
    return 'https://oss.example/immediate.jpg';
  };
  photoStorage.removeLocalPhoto = async () => true;
  const statuses = [];

  const result = await repository.uploadRecordPhotos(
    'record-photo-immediate',
    ['wxfile://tmp/immediate.jpg'],
    { currentPhotos: [], onProgress: (detail) => statuses.push(detail.status) }
  );

  // 字节落地 OSS 即替换为远端地址，保存门放开
  assert.deepEqual(result.photos, ['https://oss.example/immediate.jpg']);
  assert.deepEqual(statuses, ['reading', 'uploading', 'uploading', 'success']);
  assert.equal(repository.getPhotoSyncStatus('record-photo-immediate', 'https://oss.example/immediate.jpg'), 'success');
  // 元数据登记在后台队列完成，不阻塞保存
  await repository.syncPendingRecords({ includePhotos: true });
  assert.equal(registered, 1);
  assert.equal(repository.getRecordSyncState().pending, 0);
});

test('同步时自动发现并补传历史遗留的 http://store 照片', async () => {
  enableAccount('user-photo-repair');
  workspace.upsertRecord('user-photo-repair', {
    id: 'record-photo-repair', date: '2026-07-15', type: '一序列', duration: 3600,
    photos: ['http://store/legacy.png'], sync_state: 'synced'
  });
  let uploaded = 0;
  photoStorage.uploadPhoto = async (recordId, path) => {
    uploaded += 1;
    assert.equal(recordId, 'record-photo-repair');
    assert.equal(path, 'http://store/legacy.png');
    return 'https://oss.example/repaired.png';
  };
  photoStorage.removeLocalPhoto = async () => true;

  const result = await repository.syncPendingRecords({ includePhotos: true });

  assert.equal(result.pending, 0);
  assert.equal(uploaded, 1);
  assert.deepEqual(workspace.getRecord('user-photo-repair', 'record-photo-repair').photos, [
    'https://oss.example/repaired.png'
  ]);
  assert.ok(repository.getRecordSyncState().logs.some((log) => log.action === 'queue_local_photo'));
});

test('跨设备编辑冲突按更新时间保留更新的云端版本并写入冲突日志', async () => {
  enableAccount('user-conflict');
  workspace.upsertRecord('user-conflict', {
    id: 'record-conflict', date: '2026-07-15', type: '一序列', duration: 1800,
    notes: '本机旧内容', created_at: '2026-07-01T00:00:00.000Z', updated_at: '2026-07-10T00:00:00.000Z'
  });
  cloudRecords.getRecordById = async () => ({
    id: 'record-conflict', date: '2026-07-15', type: '一序列', duration: 2400,
    notes: '另一台设备的新内容', photos: [], updated_at: '2099-07-15T00:00:00.000Z'
  });
  let updateCalls = 0;
  cloudRecords.updateRecord = async () => { updateCalls += 1; };

  const result = await repository.updateRecord('record-conflict', { notes: '当前设备修改' });

  assert.equal(updateCalls, 0);
  assert.equal(result.notes, '另一台设备的新内容');
  assert.ok(repository.getRecordSyncState().logs.some((log) => (
    log.stage === 'conflict' && log.action === 'keep_remote'
  )));
});

test('登录后可把游客记录合并进账号且同一账号只提示一次', async () => {
  localData.replaceRecords([
    {
      id: 'guest-merge-record', date: '2026-07-14', type: '一序列', duration: 3000,
      notes: '游客记录', photos: [], created_at: '2026-07-14T00:00:00.000Z', updated_at: '2026-07-14T00:00:00.000Z'
    },
    {
      id: 'tutorial-record', date: '2026-07-01', type: '一序列 Mysore', duration: 5400,
      notes: '教程觉察笔记', photos: [], is_tutorial: true,
      created_at: '2026-07-01T00:00:00.000Z', updated_at: '2026-07-01T00:00:00.000Z'
    }
  ]);
  enableAccount('user-guest-merge');
  cloudRecords.getRecordsByDateRange = async () => [];
  cloudOptions.getPracticeOptions = async () => [];
  cloudProfile.getUserProfile = async () => null;
  cloudAnnotations.getTypes = async () => [];
  let uploaded = 0;
  cloudRecords.createRecord = async (input) => { uploaded += 1; return { ...input, photos: [] }; };

  assert.equal(repository.getGuestMergeSummary().eligible, true);
  assert.equal(repository.getGuestMergeSummary().counts.records, 1);
  const result = await repository.migrateGuestDataToAccount();

  assert.equal(uploaded, 1);
  assert.equal(result.pending, 0);
  assert.equal(repository.getGuestMergeSummary().eligible, false);
  assert.equal(workspace.getRecord('user-guest-merge', 'guest-merge-record').sync_state, 'synced');
  assert.equal(workspace.getRecord('user-guest-merge', 'tutorial-record'), null);
});
