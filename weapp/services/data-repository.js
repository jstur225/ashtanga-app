const auth = require('./auth');
const localData = require('./local-data');
const cloudRecords = require('./practice-records');
const cloudOptions = require('./practice-options');
const cloudProfile = require('./user-profile');
const cloudAnnotations = require('./cloud-annotations');
const accountWorkspace = require('./account-workspace');
const localProfile = require('./local-profile');
const photoStorage = require('./photo-storage');
const membershipService = require('./membership');
const membershipPolicy = require('./membership-policy');
const runtimeErrors = require('./runtime-errors');
const sharedReadCache = require('./shared-read-cache');
let accountSyncPromise = null;
let accountSyncIncludesPhotos = false;

const SHARED_READ_TTL_MS = 30 * 1000;

const GUEST_MIGRATION_KEY_PREFIX = 'weapp_guest_migration_v1';

function isCloudMode() {
  if (wx.getStorageSync('weapp_guest_mode_enabled')) {
    return false;
  }
  if (!wx.getStorageSync('weapp_account_mode_enabled')) {
    return false;
  }
  const session = auth.getStoredSession();
  return Boolean(session && session.user && session.user.id);
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getAccountId() {
  const session = auth.getStoredSession();
  return session && session.user ? session.user.id || '' : '';
}

function readCacheKey(accountId, resource) {
  return `${accountId}:${resource}`;
}

function invalidateSharedReads(resource = '') {
  const accountId = getAccountId();
  if (!accountId) {
    sharedReadCache.invalidate();
    return;
  }
  sharedReadCache.invalidate(readCacheKey(accountId, resource));
}

function isRecentAccount() {
  const session = auth.getStoredSession();
  const createdAt = Date.parse(session && session.user && session.user.created_at ? session.user.created_at : '');
  return Boolean(createdAt && Date.now() - createdAt >= 0 && Date.now() - createdAt <= 24 * 60 * 60 * 1000);
}

async function getCurrentCapabilities() {
  try {
    return membershipPolicy.getCapabilities(await membershipService.getMembershipStatus());
  } catch (error) {
    return membershipPolicy.FREE;
  }
}

function buildLocalRecord(input) {
  const now = new Date().toISOString();
  return {
    id: createUuid(),
    date: input.date,
    type: input.type,
    duration: Math.max(0, Number(input.duration) || 0),
    notes: input.notes || '今日练习完成',
    breakthrough: input.breakthrough || null,
    start_time: input.start_time || null,
    color_level: Math.min(4, Math.max(1, Number(input.color_level) || 3)),
    photos: Array.isArray(input.photos) ? input.photos : [],
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_state: 'local'
  };
}

async function getEarliestRecordDate() {
  try {
    if (!isCloudMode()) {
      const records = localData.getAllRecords().filter((record) => record.type !== '草稿');
      if (!records.length) return '';
      return String(records.reduce((a, b) => (a.date < b.date ? a : b)).date || '');
    }
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const cached = accountWorkspace.getRecordsByDateRange(getAccountId(), '2000-01-01', todayStr)
      .filter((record) => record.type !== '草稿');
    if (cached.length) {
      return String(cached.reduce((a, b) => (a.date < b.date ? a : b)).date || '');
    }
    return cloudRecords.getEarliestRecordDate();
  } catch (error) {
    return '';
  }
}

async function getPracticeOptions() {
  if (!isCloudMode()) return localData.getOptions();
  const accountId = getAccountId();
  const syncResult = await syncPendingRecords();
  try {
    return await sharedReadCache.run(
      readCacheKey(accountId, 'options'),
      async () => {
        const options = await cloudOptions.getPracticeOptions();
        accountWorkspace.replaceOptions(accountId, options);
        return options && options.length ? options : localData.DEFAULT_OPTIONS;
      },
      {
        ttlMs: SHARED_READ_TTL_MS,
        force: Boolean(syncResult && syncResult.synced),
        canUseCached: () => accountWorkspace.hasCachedOptions(accountId),
        readCached: () => {
          const options = accountWorkspace.getOptions(accountId);
          return options && options.length ? options : localData.DEFAULT_OPTIONS;
        }
      }
    );
  } catch (error) {
    if (!accountWorkspace.hasCachedOptions(accountId)) throw error;
    const options = accountWorkspace.getOptions(accountId);
    return options && options.length ? options : localData.DEFAULT_OPTIONS;
  }
}

function getCachedPracticeOptions() {
  if (!isCloudMode()) return localData.getOptions();
  const options = accountWorkspace.getOptions(getAccountId());
  return options && options.length ? options : localData.DEFAULT_OPTIONS;
}

async function getRecordsByDateRange(startDate, endDate) {
  if (!isCloudMode()) return localData.getRecordsByDateRange(startDate, endDate);
  const accountId = getAccountId();
  const syncResult = await syncPendingRecords();
  const cacheKey = readCacheKey(accountId, `records:${startDate}:${endDate}`);
  try {
    return await sharedReadCache.run(
      cacheKey,
      async () => {
        const records = await cloudRecords.getRecordsByDateRange(startDate, endDate);
        accountWorkspace.replaceRecordsInRange(accountId, startDate, endDate, records);
        if (isRecentAccount()) ensureAccountTutorialFromGuest();
        if (queueStrandedPhotoUploads(accountId) > 0) await syncPendingRecords();
        return accountWorkspace.getRecordsByDateRange(accountId, startDate, endDate);
      },
      {
        ttlMs: SHARED_READ_TTL_MS,
        force: Boolean(syncResult && syncResult.synced),
        canUseCached: () => accountWorkspace.hasCachedRange(accountId, startDate, endDate),
        readCached: () => accountWorkspace.getRecordsByDateRange(accountId, startDate, endDate)
      }
    );
  } catch (error) {
    const cachedRecords = accountWorkspace.getRecordsByDateRange(accountId, startDate, endDate);
    if (!accountWorkspace.hasCachedRange(accountId, startDate, endDate) && cachedRecords.length === 0) throw error;
    return cachedRecords;
  }
}

async function createRecord(input) {
  const inputPhotos = Array.isArray(input.photos) ? input.photos : [];
  const cloudMode = isCloudMode();
  if (!cloudMode && inputPhotos.length > 0) {
    throw new Error(membershipPolicy.getReasonMessage('photo_account'));
  }
  const capabilities = await getCurrentCapabilities();
  if (inputPhotos.length > capabilities.maxPhotosPerRecord) {
    throw new Error(membershipPolicy.getReasonMessage('photo_count'));
  }
  const isPro = capabilities.tier === 'pro';
  const persistedPhotos = await photoStorage.persistPhotos(inputPhotos, { isPro });
  const preparedInput = {
    ...input,
    photos: persistedPhotos,
    color_level: membershipPolicy.normalizeColorLevel(input.color_level, isPro)
  };
  if (!cloudMode) return localData.createRecord(buildLocalRecord(preparedInput));
  const accountId = getAccountId();
  const record = { ...buildLocalRecord(preparedInput), user_id: accountId, sync_state: 'pending' };
  accountWorkspace.upsertRecord(accountId, record);
  accountWorkspace.enqueueRecordOperation(accountId, 'create', record.id, {
    ...record,
    photos: getRemotePhotos(record.photos)
  });
  queuePhotoChanges(accountId, record.id, [], record.photos);
  await syncPendingRecords();
  return accountWorkspace.getRecord(accountId, record.id) || record;
}

function getCachedRecordsByDateRange(startDate, endDate) {
  if (!isCloudMode()) return localData.getRecordsByDateRange(startDate, endDate);
  return accountWorkspace.getRecordsByDateRange(getAccountId(), startDate, endDate);
}

function getRemotePhotos(photos) {
  return (Array.isArray(photos) ? photos : []).filter(photoStorage.isCloudPhoto);
}

function stripSyncMetadata(payload = {}) {
  const next = { ...payload };
  delete next.__base_updated_at;
  delete next.__local_updated_at;
  delete next.sync_state;
  delete next.deleted_at;
  return next;
}

function sanitizeRecordPayload(payload = {}) {
  const next = stripSyncMetadata(payload);
  if (Object.prototype.hasOwnProperty.call(next, 'photos')) {
    next.photos = getRemotePhotos(next.photos);
  }
  return next;
}

function queueStrandedPhotoUploads(accountId) {
  const workspace = accountWorkspace.getWorkspace(accountId);
  const queuedKeys = new Set(workspace.pending_operations
    .filter((operation) => operation.entity === 'photo' && operation.action === 'upload')
    .map((operation) => `${operation.payload && operation.payload.record_id}:${operation.payload && operation.payload.local_path}`));
  let queued = 0;

  workspace.records.filter((record) => !record.deleted_at && !record.is_tutorial).forEach((record) => {
    (Array.isArray(record.photos) ? record.photos : [])
      .filter(photoStorage.isLocalPhoto)
      .forEach((localPath) => {
        const key = `${record.id}:${localPath}`;
        if (queuedKeys.has(key)) return;
        accountWorkspace.enqueueOperation(accountId, 'photo', 'upload', key, {
          record_id: record.id,
          local_path: localPath
        });
        queuedKeys.add(key);
        queued += 1;
      });
  });

  if (queued > 0) {
    accountWorkspace.addSyncLog(accountId, {
      stage: 'photo', status: 'repair', action: 'queue_local_photo',
      message: `检测到 ${queued} 张未上传的本机照片，已加入补传队列`
    });
  }
  return queued;
}

function queuePhotoChanges(accountId, recordId, previousPhotos, nextPhotos) {
  const previous = Array.isArray(previousPhotos) ? previousPhotos : [];
  const next = Array.isArray(nextPhotos) ? nextPhotos : [];
  next.filter((path) => !photoStorage.isRemotePhoto(path) && !previous.includes(path)).forEach((path) => {
    accountWorkspace.enqueueOperation(accountId, 'photo', 'upload', `${recordId}:${path}`, {
      record_id: recordId,
      local_path: path
    });
  });
  previous.filter((path) => !photoStorage.isRemotePhoto(path) && !next.includes(path)).forEach((path) => {
    accountWorkspace.removePendingOperations(accountId, (operation) => (
      operation.entity === 'photo' && operation.action === 'upload' &&
      operation.payload && operation.payload.record_id === recordId && operation.payload.local_path === path
    ));
    photoStorage.removeLocalPhoto(path).catch(() => {});
  });
  previous.filter(photoStorage.isRemotePhoto).filter((path) => !next.includes(path)).forEach((path) => {
    accountWorkspace.enqueueOperation(accountId, 'photo', 'delete', `${recordId}:${path}`, {
      record_id: recordId,
      oss_url: path
    });
  });
}

function emitPhotoProgress(options, detail) {
  if (options && typeof options.onProgress === 'function') {
    options.onProgress(detail);
  }
}

async function ensureCloudRecordReady(accountId, recordId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const pendingCreate = accountWorkspace.getPendingOperations(accountId).some((operation) => (
      operation.entity === 'record'
      && operation.action === 'create'
      && operation.record_id === recordId
    ));
    if (!pendingCreate) return true;
    await syncPendingRecords({ throwOnError: true });
  }
  throw new Error('练习草稿尚未同步，请稍后重试照片上传');
}

async function uploadRecordPhotos(recordId, paths, options = {}) {
  if (!isCloudMode()) throw new Error(membershipPolicy.getReasonMessage('photo_account'));
  const accountId = getAccountId();
  const current = accountWorkspace.getRecord(accountId, recordId);
  if (!current) throw new Error('本机工作区中找不到照片对应的练习记录');

  const selectedPaths = [...new Set((Array.isArray(paths) ? paths : [])
    .filter((path) => path && !photoStorage.isRemotePhoto(path)))];
  if (!selectedPaths.length) {
    return { photos: Array.isArray(current.photos) ? current.photos : [], uploaded: [], failed: [] };
  }
  const photoTrace = runtimeErrors.startTrace('photo', 'record_photo_batch', {
    selected_count: selectedPaths.length,
    existing_count: Array.isArray(current.photos) ? current.photos.length : 0
  });

  const suppliedCapabilities = Object.prototype.hasOwnProperty.call(options, 'isPro')
    ? {
      tier: options.isPro ? 'pro' : 'free',
      maxPhotosPerRecord: Math.min(9, Math.max(1, Number(options.maxPhotos) || 1))
    }
    : null;
  let capabilities;
  try {
    capabilities = suppliedCapabilities || await getCurrentCapabilities();
  } catch (error) {
    runtimeErrors.finishTrace(photoTrace, 'error', { stage: 'membership', message: error && error.message });
    throw error;
  }
  const isPro = capabilities.tier === 'pro';
  const currentFormPhotos = Array.isArray(options.currentPhotos)
    ? [...new Set(options.currentPhotos.filter(Boolean))]
    : [...new Set((Array.isArray(current.photos) ? current.photos : []).filter(Boolean))];
  const nextCount = new Set([...currentFormPhotos, ...selectedPaths]).size;
  if (nextCount > capabilities.maxPhotosPerRecord) {
    const error = new Error(membershipPolicy.getReasonMessage('photo_count'));
    runtimeErrors.finishTrace(photoTrace, 'error', {
      stage: 'limit_check',
      next_count: nextCount,
      max_count: capabilities.maxPhotosPerRecord,
      message: error.message
    });
    throw error;
  }

  // 与网页版一致：若用户先移除了旧照片再添加新照片，先真正删除旧照片以腾出额度。
  const removedRemotePhotos = Array.isArray(options.currentPhotos)
    ? (Array.isArray(current.photos) ? current.photos : [])
      .filter(photoStorage.isRemotePhoto)
      .filter((path) => !currentFormPhotos.includes(path))
    : [];
  const prepared = [];
  let preparationStage = 'delete_removed';
  try {
    for (const remotePath of removedRemotePhotos) {
      await photoStorage.deleteRemotePhoto(recordId, remotePath);
    }

    // 先校验整批大小，避免部分文件已经保存、后面的文件才失败。
    preparationStage = 'validate';
    for (const sourcePath of selectedPaths) {
      emitPhotoProgress(options, { sourcePath, path: sourcePath, status: 'reading' });
      await photoStorage.validatePhotoSize(sourcePath, { isPro });
    }

    preparationStage = 'persist';
    for (const sourcePath of selectedPaths) {
      const localPath = await photoStorage.persistPhoto(sourcePath, { isPro });
      prepared.push({ sourcePath, localPath });
      emitPhotoProgress(options, { sourcePath, path: localPath, status: 'uploading' });
    }
  } catch (error) {
    runtimeErrors.finishTrace(photoTrace, 'error', {
      stage: preparationStage,
      prepared_count: prepared.length,
      message: error && error.message
    });
    throw error;
  }

  const localPaths = prepared.map((item) => item.localPath);
  const workspacePhotos = [...new Set([...currentFormPhotos, ...localPaths])];
  accountWorkspace.upsertRecord(accountId, {
    ...current,
    photos: workspacePhotos,
    updated_at: new Date().toISOString()
  });
  queuePhotoChanges(accountId, recordId, current.photos, workspacePhotos);

  try {
    await ensureCloudRecordReady(accountId, recordId);
  } catch (error) {
    prepared.forEach(({ sourcePath, localPath }) => {
      const operation = accountWorkspace.getPendingOperations(accountId).find((item) => (
        item.entity === 'photo'
        && item.action === 'upload'
        && item.payload
        && item.payload.record_id === recordId
        && item.payload.local_path === localPath
      ));
      if (operation) accountWorkspace.markOperationFailed(accountId, operation.id, error);
      emitPhotoProgress(options, { sourcePath, path: localPath, status: 'error', error });
    });
    runtimeErrors.finishTrace(photoTrace, 'error', {
      stage: 'ensure_record',
      message: error && error.message
    });
    throw error;
  }

  const uploaded = [];
  const failed = [];
  const uploadOne = async ({ sourcePath, localPath }) => {
    const operation = accountWorkspace.getPendingOperations(accountId).find((item) => (
      item.entity === 'photo'
      && item.action === 'upload'
      && item.payload
      && item.payload.record_id === recordId
      && item.payload.local_path === localPath
    ));
    emitPhotoProgress(options, { sourcePath, path: localPath, status: 'uploading' });
    try {
      const remote = await photoStorage.uploadPhotoToOss(localPath, { isPro });
      const remotePath = remote.ossUrl;
      accountWorkspace.replaceRecordPhoto(accountId, recordId, localPath, remotePath);
      accountWorkspace.removePendingOperations(accountId, (item) => (
        item.entity === 'photo'
        && item.action === 'upload'
        && item.payload
        && item.payload.record_id === recordId
        && item.payload.local_path === localPath
      ));
      // 字节已落地 OSS：把“上传”待办换成“登记”待办，元数据登记转入后台，不阻塞保存。
      accountWorkspace.enqueueOperation(accountId, 'photo', 'register', `${recordId}:${remotePath}`, {
        record_id: recordId,
        oss_url: remotePath,
        oss_key: remote.ossKey,
        file_size: remote.fileSize,
        mime_type: remote.mimeType
      });
      await photoStorage.removeLocalPhoto(localPath);
      accountWorkspace.addSyncLog(accountId, {
        stage: 'photo', status: 'success', action: 'upload', entity_id: recordId,
        message: '照片已上传到云端，元数据登记转入后台'
      });
      uploaded.push(remotePath);
      emitPhotoProgress(options, {
        sourcePath, path: localPath, remotePath, status: 'success'
      });
    } catch (error) {
      if (operation) accountWorkspace.markOperationFailed(accountId, operation.id, error);
      accountWorkspace.addSyncLog(accountId, {
        stage: 'photo', status: 'error', action: 'upload', entity_id: recordId,
        message: error && error.message ? error.message : '照片上传失败'
      });
      failed.push({ path: localPath, error });
      runtimeErrors.recordEvent('photo', 'photo_upload_failed', {
        message: error && error.message
      }, { level: 'error', immediate: true });
      emitPhotoProgress(options, { sourcePath, path: localPath, status: 'error', error });
    }
  };

  // 与网页版一致，每批最多并发上传 2 张。
  for (let index = 0; index < prepared.length; index += 2) {
    await Promise.all(prepared.slice(index, index + 2).map(uploadOne));
  }

  // 照片字节已全部落地 OSS；元数据登记走后台待办队列，不阻塞保存。
  const hasRegisterOps = accountWorkspace.getPendingOperations(accountId)
    .some((item) => item.entity === 'photo' && item.action === 'register');
  if (hasRegisterOps) {
    syncPendingRecords({ includePhotos: true }).catch(() => null);
  }

  const record = accountWorkspace.getRecord(accountId, recordId);
  runtimeErrors.finishTrace(photoTrace, failed.length ? 'warning' : 'success', {
    uploaded_count: uploaded.length,
    failed_count: failed.length,
    final_photo_count: record && Array.isArray(record.photos) ? record.photos.length : workspacePhotos.length
  });
  return {
    photos: record && Array.isArray(record.photos) ? record.photos : workspacePhotos,
    uploaded,
    failed
  };
}

async function updateRecord(id, updates) {
  const capabilities = await getCurrentCapabilities();
  const isPro = capabilities.tier === 'pro';
  const cloudMode = isCloudMode();
  const accountId = cloudMode ? getAccountId() : '';
  const current = cloudMode
    ? accountWorkspace.getRecord(accountId, id)
    : localData.getAllRecords().find((record) => record.id === id);
  if (!current) throw new Error(cloudMode ? '本机工作区中找不到该练习记录' : '没有找到这条本机记录');
  const preparedUpdates = { ...updates };
  if (Object.prototype.hasOwnProperty.call(updates, 'photos')) {
    const inputPhotos = Array.isArray(updates.photos) ? updates.photos : [];
    const previousPhotos = Array.isArray(current.photos) ? current.photos : [];
    const addedPhotos = inputPhotos.filter((photo) => !previousPhotos.includes(photo));
    if (!cloudMode && addedPhotos.length > 0) {
      throw new Error(membershipPolicy.getReasonMessage('photo_account'));
    }
    if (inputPhotos.length > capabilities.maxPhotosPerRecord && addedPhotos.length > 0) {
      throw new Error(membershipPolicy.getReasonMessage('photo_count'));
    }
    preparedUpdates.photos = await photoStorage.persistPhotos(inputPhotos, { isPro });
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'color_level')) {
    preparedUpdates.color_level = membershipPolicy.normalizeColorLevel(updates.color_level, isPro);
  }
  if (!cloudMode) {
    if (Object.prototype.hasOwnProperty.call(preparedUpdates, 'photos')) {
      const nextPhotos = preparedUpdates.photos || [];
      (current && Array.isArray(current.photos) ? current.photos : [])
        .filter((path) => !nextPhotos.includes(path) && !photoStorage.isRemotePhoto(path))
        .forEach((path) => photoStorage.removeLocalPhoto(path).catch(() => {}));
    }
    return localData.updateRecord(id, preparedUpdates);
  }
  if (current.is_tutorial) {
    return accountWorkspace.updateLocalOnlyRecord(accountId, id, preparedUpdates);
  }
  const next = accountWorkspace.updateLocalRecord(accountId, id, preparedUpdates);
  accountWorkspace.enqueueRecordOperation(accountId, 'update', id, {
    ...preparedUpdates,
    ...(Object.prototype.hasOwnProperty.call(preparedUpdates, 'photos')
      ? { photos: getRemotePhotos(preparedUpdates.photos) }
      : {}),
    __base_updated_at: current.updated_at || current.created_at || '',
    __local_updated_at: next.updated_at
  });
  if (Object.prototype.hasOwnProperty.call(preparedUpdates, 'photos')) {
    queuePhotoChanges(accountId, id, current.photos, next.photos);
  }
  await syncPendingRecords();
  return accountWorkspace.getRecord(accountId, id) || next;
}

async function softDeleteRecord(id) {
  if (!isCloudMode()) {
    const current = localData.getAllRecords().find((record) => record.id === id);
    const result = localData.softDeleteRecord(id);
    (current && Array.isArray(current.photos) ? current.photos : [])
      .filter((path) => !photoStorage.isRemotePhoto(path))
      .forEach((path) => photoStorage.removeLocalPhoto(path).catch(() => {}));
    return result;
  }
  const accountId = getAccountId();
  const current = accountWorkspace.getRecord(accountId, id);
  if (current && current.is_tutorial) {
    accountWorkspace.updateLocalOnlyRecord(accountId, id, {
      deleted_at: new Date().toISOString()
    });
    return true;
  }
  accountWorkspace.markRecordDeleted(accountId, id);
  accountWorkspace.enqueueRecordOperation(accountId, 'delete', id);
  queuePhotoChanges(accountId, id, current && current.photos, []);
  await syncPendingRecords();
  return true;
}

async function syncRecordUpdate(accountId, operation) {
  const payload = operation.payload || {};
  const baseTime = Date.parse(payload.__base_updated_at || '') || 0;
  const localTime = Date.parse(payload.__local_updated_at || '') || 0;
  if (!baseTime) {
    return cloudRecords.updateRecord(operation.record_id, sanitizeRecordPayload(payload));
  }
  const remote = await cloudRecords.getRecordById(operation.record_id);
  const remoteTime = Date.parse(remote && remote.updated_at ? remote.updated_at : '') || 0;

  if (remote && remoteTime > baseTime && remoteTime > localTime) {
    accountWorkspace.markRecordSynced(accountId, remote);
    accountWorkspace.addSyncLog(accountId, {
      stage: 'conflict', status: 'resolved', action: 'keep_remote',
      entity_id: operation.record_id,
      message: '检测到其他设备更新，已保留时间更新的云端版本'
    });
    return remote;
  }

  if (remote && remoteTime > baseTime) {
    accountWorkspace.addSyncLog(accountId, {
      stage: 'conflict', status: 'resolved', action: 'keep_local',
      entity_id: operation.record_id,
      message: '检测到其他设备更新，当前设备版本更新时间更晚，已继续上传'
    });
  }
  return cloudRecords.updateRecord(operation.record_id, sanitizeRecordPayload(payload));
}

async function runPendingSync(options = {}) {
  if (!isCloudMode()) return { synced: 0, pending: 0, error: null };
  const accountId = getAccountId();
  queueStrandedPhotoUploads(accountId);
  const allPendingOperations = accountWorkspace.getPendingOperations(accountId);
  const operationsToSync = options.includePhotos
    ? allPendingOperations
    : allPendingOperations.filter((operation) => operation.entity !== 'photo');
  const pendingBefore = operationsToSync.length;
  const syncTrace = runtimeErrors.startTrace('sync', 'pending_operations', {
    pending_before: pendingBefore,
    include_photos: Boolean(options.includePhotos),
    by_entity: operationsToSync.reduce((counts, operation) => {
      const key = operation.entity || 'record';
      counts[key] = Number(counts[key] || 0) + 1;
      return counts;
    }, {})
  });
  const hasPhotoUpload = operationsToSync
    .some((operation) => operation.entity === 'photo' && operation.action === 'upload');
  let photoUploadIsPro = false;
  if (hasPhotoUpload) {
    try {
      const membership = await membershipService.getMembershipStatus();
      photoUploadIsPro = membershipPolicy.isActiveMembership(membership);
    } catch (error) {
      photoUploadIsPro = false;
    }
  }
  let synced = 0;
  let lastError = null;

  const operationIds = operationsToSync.map((operation) => operation.id);
  accountWorkspace.addSyncLog(accountId, {
    stage: 'sync', status: 'start', message: `开始同步 ${pendingBefore} 项变更`
  });

  for (const operationId of operationIds) {
    const operation = accountWorkspace.getPendingOperations(accountId).find((item) => item.id === operationId);
    if (!operation) continue;
    try {
      if (operation.entity === 'record' && operation.action === 'create') {
        const record = await cloudRecords.createRecord({ ...sanitizeRecordPayload(operation.payload), id: operation.record_id });
        if (record) accountWorkspace.markRecordSynced(accountId, record);
      } else if (operation.entity === 'record' && operation.action === 'update') {
        const record = await syncRecordUpdate(accountId, operation);
        if (record) accountWorkspace.markRecordSynced(accountId, record);
      } else if (operation.entity === 'record' && operation.action === 'delete') {
        await cloudRecords.softDeleteRecord(operation.record_id);
      } else if (operation.entity === 'option' && operation.action === 'create') {
        const created = await cloudOptions.createPracticeOption({ ...operation.payload, id: operation.entity_id, user_id: accountId });
        if (created) accountWorkspace.markOptionSynced(accountId, created);
      } else if (operation.entity === 'option' && operation.action === 'update') {
        const updated = await cloudOptions.updatePracticeOption(operation.entity_id, operation.payload);
        if (updated) accountWorkspace.markOptionSynced(accountId, updated);
      } else if (operation.entity === 'option' && operation.action === 'delete') {
        await cloudOptions.deletePracticeOption(operation.entity_id);
      } else if (operation.entity === 'profile') {
        const saved = await cloudProfile.saveUserProfile(operation.payload);
        accountWorkspace.saveProfile(accountId, { ...operation.payload, ...(saved || {}) }, true);
      } else if (operation.entity === 'annotation_type' && operation.action === 'create') {
        let created;
        try {
          created = await cloudAnnotations.createType(operation.payload.label, operation.payload.color);
        } catch (error) {
          const errorCode = error && error.body && error.body.error;
          const canReconcile = error && (
            error.statusCode === 409 ||
            errorCode === 'DUPLICATE_LABEL' ||
            errorCode === 'LIMIT_REACHED'
          );
          if (!canReconcile) throw error;
          const remoteTypes = await cloudAnnotations.getTypes();
          const normalizedLabel = String(operation.payload.label || '').trim().toLocaleLowerCase();
          created = remoteTypes.find((type) => (
            String(type.label || '').trim().toLocaleLowerCase() === normalizedLabel
          ));
          if (!created) throw error;
          accountWorkspace.addSyncLog(accountId, {
            stage: 'annotation_type', status: 'resolved', action: 'reuse_existing',
            entity_id: operation.entity_id,
            message: `云端已存在同名标注「${created.label}」，已自动关联`
          });
        }
        if (!created) throw new Error('云端未返回新标注类型');
        accountWorkspace.remapAnnotationTypeId(accountId, operation.entity_id, created);
      } else if (operation.entity === 'annotation_type' && operation.action === 'update') {
        const updated = await cloudAnnotations.updateType(operation.entity_id, operation.payload);
        if (updated) {
          const current = accountWorkspace.getAnnotations(accountId);
          accountWorkspace.saveAnnotations(accountId, {
            types: [...current.types.filter((type) => type.id !== operation.entity_id), updated]
          });
        }
      } else if (operation.entity === 'annotation_type' && operation.action === 'delete') {
        await cloudAnnotations.deleteType(operation.entity_id);
      } else if (operation.entity === 'annotation_assignment' && operation.action === 'create') {
        await cloudAnnotations.addAssignment(operation.payload.type_id, operation.payload.date);
      } else if (operation.entity === 'annotation_assignment' && operation.action === 'delete') {
        await cloudAnnotations.removeAssignment(operation.payload.type_id, operation.payload.date);
      } else if (operation.entity === 'photo' && operation.action === 'register') {
        await photoStorage.registerPhotoMetadata(operation.payload.record_id, {
          ossUrl: operation.payload.oss_url,
          ossKey: operation.payload.oss_key,
          fileSize: operation.payload.file_size,
          mimeType: operation.payload.mime_type
        });
      } else if (operation.entity === 'photo' && operation.action === 'upload') {
        const ossUrl = await photoStorage.uploadPhoto(
          operation.payload.record_id,
          operation.payload.local_path,
          { isPro: photoUploadIsPro }
        );
        accountWorkspace.replaceRecordPhoto(
          accountId,
          operation.payload.record_id,
          operation.payload.local_path,
          ossUrl
        );
        await photoStorage.removeLocalPhoto(operation.payload.local_path);
      } else if (operation.entity === 'photo' && operation.action === 'delete') {
        await photoStorage.deleteRemotePhoto(operation.payload.record_id, operation.payload.oss_url);
      }
      accountWorkspace.removePendingOperation(accountId, operation.id);
      accountWorkspace.addSyncLog(accountId, {
        stage: operation.entity, status: 'success', action: operation.action,
        entity_id: operation.entity_id || operation.record_id,
        message: `${operation.entity} ${operation.action} 同步成功`
      });
      synced += 1;
    } catch (error) {
      lastError = error;
      accountWorkspace.markOperationFailed(accountId, operation.id, error);
      accountWorkspace.addSyncLog(accountId, {
        stage: operation.entity || 'record', status: 'error', action: operation.action,
        entity_id: operation.entity_id || operation.record_id,
        message: error && error.message ? error.message : '同步失败'
      });
      runtimeErrors.recordEvent('sync', 'operation_failed', {
        entity: operation.entity || 'record',
        action: operation.action,
        attempts: Number(operation.attempts || 0) + 1,
        message: error && error.message ? error.message : '同步失败'
      }, { level: 'error', immediate: true });
    }
  }

  const result = {
    pending_before: pendingBefore,
    synced,
    pending: accountWorkspace.getPendingOperations(accountId).length,
    error: lastError
  };
  accountWorkspace.finishSync(accountId, lastError ? 'error' : result.pending === 0 ? 'success' : 'pending');
  runtimeErrors.finishTrace(syncTrace, lastError ? 'error' : result.pending === 0 ? 'success' : 'warning', {
    synced: result.synced,
    pending_after: result.pending,
    message: lastError && lastError.message
  });
  if (lastError && options.throwOnError) throw lastError;
  return result;
}

async function syncPendingRecords(options = {}) {
  if (accountSyncPromise) {
    if (!options.includePhotos && accountSyncIncludesPhotos) {
      return {
        synced: 0,
        pending: accountWorkspace.getPendingOperations(getAccountId()).length,
        error: null,
        background_photos: true
      };
    }
    return accountSyncPromise;
  }
  if (!isCloudMode()) return { synced: 0, pending: 0, error: null, skipped: true };
  const accountId = getAccountId();
  if (options.includePhotos) queueStrandedPhotoUploads(accountId);
  const allPending = accountWorkspace.getPendingOperations(accountId);
  const eligiblePending = options.includePhotos
    ? allPending
    : allPending.filter((operation) => operation.entity !== 'photo');
  if (eligiblePending.length === 0) {
    return {
      synced: 0,
      pending: allPending.length,
      error: null,
      skipped: true,
      background_photos: !options.includePhotos && allPending.some((operation) => operation.entity === 'photo')
    };
  }
  accountSyncIncludesPhotos = Boolean(options.includePhotos);
  accountSyncPromise = runPendingSync(options).finally(() => {
    accountSyncPromise = null;
    accountSyncIncludesPhotos = false;
  });
  return accountSyncPromise;
}

function syncPhotosInBackground() {
  if (!isCloudMode()) return Promise.resolve(null);
  const accountId = getAccountId();
  queueStrandedPhotoUploads(accountId);
  const hasPendingPhotos = accountWorkspace.getPendingOperations(accountId)
    .some((operation) => operation.entity === 'photo');
  if (!hasPendingPhotos) return Promise.resolve(null);
  return syncPendingRecords({ includePhotos: true }).catch((error) => ({
    synced: 0,
    pending: accountWorkspace.getPendingOperations(accountId).length,
    error
  }));
}

function getRecordSyncState() {
  if (!isCloudMode()) return { pending: 0, last_error: '' };
  const operations = accountWorkspace.getPendingOperations(getAccountId());
  const workspace = accountWorkspace.getWorkspace(getAccountId());
  const counts = operations.reduce((result, operation) => {
    const key = operation.entity || 'record';
    result[key] = Number(result[key] || 0) + 1;
    return result;
  }, {});
  return {
    pending: operations.length,
    pending_by_entity: counts,
    last_error: operations.find((operation) => operation.last_error)?.last_error || '',
    last_sync_at: workspace.last_sync_at,
    last_sync_status: workspace.last_sync_status,
    logs: workspace.sync_logs
  };
}

function getPhotoSyncStatus(recordId, path) {
  if (photoStorage.isCloudPhoto(path)) return 'success';
  if (!isCloudMode()) return 'stored';
  const operation = accountWorkspace.getPendingOperations(getAccountId()).find((item) => (
    item.entity === 'photo' &&
    item.action === 'upload' &&
    item.payload &&
    item.payload.record_id === recordId &&
    item.payload.local_path === path
  ));
  if (operation && operation.last_error) return 'error';
  return operation ? 'uploading' : 'pending';
}

async function addPracticeOption(input) {
  const capabilities = await getCurrentCapabilities();
  const cloudMode = isCloudMode();
  const currentOptions = cloudMode
    ? accountWorkspace.getOptions(getAccountId())
    : localData.getOptions();
  if (currentOptions.length >= capabilities.maxPracticeOptions) {
    throw new Error(`当前最多保留 ${capabilities.maxPracticeOptions} 个练习类型`);
  }
  const safeInput = {
    ...input,
    color_level: membershipPolicy.normalizeColorLevel(input.color_level, capabilities.tier === 'pro')
  };
  if (cloudMode) {
    const accountId = getAccountId();
    const now = new Date().toISOString();
    const option = {
      id: safeInput.id || createUuid(), user_id: accountId, label: safeInput.label,
      notes: safeInput.notes || '', is_custom: true, color_level: safeInput.color_level,
      created_at: now, updated_at: now, sync_state: 'pending'
    };
    accountWorkspace.upsertOption(accountId, option);
    accountWorkspace.enqueueOperation(accountId, 'option', 'create', option.id, option);
    await syncPendingRecords();
    return accountWorkspace.getOption(accountId, option.id) || option;
  }
  return localData.addOption({
    ...safeInput,
    id: createUuid()
  }, capabilities.maxPracticeOptions);
}

async function updatePracticeOption(id, updates) {
  if (isCloudMode()) {
    const accountId = getAccountId();
    const option = accountWorkspace.updateLocalOption(accountId, id, updates);
    accountWorkspace.enqueueOperation(accountId, 'option', 'update', id, updates);
    await syncPendingRecords();
    return accountWorkspace.getOption(accountId, id) || option;
  }
  return localData.updateOption(id, updates);
}

async function deletePracticeOption(id) {
  if (isCloudMode()) {
    const accountId = getAccountId();
    accountWorkspace.markOptionDeleted(accountId, id);
    accountWorkspace.enqueueOperation(accountId, 'option', 'delete', id);
    await syncPendingRecords();
    return true;
  }
  return localData.deleteOption(id);
}

function getMode() {
  return isCloudMode() ? 'cloud' : 'guest';
}

function ensureAccountTutorialFromGuest() {
  if (!isCloudMode()) return null;
  const accountId = getAccountId();
  const existing = accountWorkspace.getWorkspace(accountId).records.find((record) => (
    record.is_tutorial
  ));
  // A soft-deleted tutorial means the user deliberately dismissed it. Keep the
  // tombstone so a later empty cloud refresh cannot restore it unexpectedly.
  if (existing) return existing.deleted_at ? null : existing;
  const guestTutorial = localData.getAllRecords().find((record) => (
    record.is_tutorial && !record.deleted_at
  ));
  if (!guestTutorial) return null;
  const tutorial = {
    ...guestTutorial,
    user_id: accountId,
    sync_state: 'local'
  };
  accountWorkspace.upsertRecord(accountId, tutorial);
  return tutorial;
}

// ===== Profile =====

async function getProfile() {
  if (!isCloudMode()) return localProfile.getProfile();
  const accountId = getAccountId();
  await syncPendingRecords();
  const hasPendingProfile = accountWorkspace.getPendingOperations(accountId)
    .some((operation) => operation.entity === 'profile');
  if (hasPendingProfile && accountWorkspace.getProfile(accountId)) {
    return accountWorkspace.getProfile(accountId);
  }
  try {
    const profile = await cloudProfile.getUserProfile();
    if (profile) {
      const cachedAvatar = accountWorkspace.getProfile(accountId)?.avatar || '';
      accountWorkspace.saveProfile(accountId, {
        ...profile,
        avatar: profile.avatar || cachedAvatar
      }, true);
      return accountWorkspace.getProfile(accountId);
    }
    accountWorkspace.saveProfile(accountId, {
      ...localProfile.DEFAULT_PROFILE,
      user_id: accountId,
      updated_at: ''
    }, true);
    return accountWorkspace.getProfile(accountId);
  } catch (error) {
    if (!accountWorkspace.hasCachedProfile(accountId)) throw error;
  }
  return accountWorkspace.getProfile(accountId) || localProfile.DEFAULT_PROFILE;
}

function getCachedProfile() {
  return isCloudMode()
    ? accountWorkspace.getProfile(getAccountId()) || localProfile.DEFAULT_PROFILE
    : localProfile.getProfile();
}

function getCachedAnnotations() {
  return isCloudMode()
    ? accountWorkspace.getAnnotations(getAccountId())
    : localData.getAllAnnotations();
}

async function saveProfile(input) {
  if (!isCloudMode()) return localProfile.saveProfile(input);
  const accountId = getAccountId();
  const current = accountWorkspace.getProfile(accountId) || localProfile.DEFAULT_PROFILE;
  const profile = { ...current, ...input, user_id: accountId, updated_at: new Date().toISOString(), sync_state: 'pending' };
  accountWorkspace.saveProfile(accountId, profile, false);
  accountWorkspace.enqueueOperation(accountId, 'profile', 'update', 'profile', profile);
  await syncPendingRecords();
  return accountWorkspace.getProfile(accountId) || profile;
}

// ===== Annotations =====

async function getAnnotationTypes() {
  if (!isCloudMode()) return localData.getTypes();
  const accountId = getAccountId();
  const syncResult = await syncPendingRecords();
  try {
    return await sharedReadCache.run(
      readCacheKey(accountId, 'annotation-types'),
      async () => {
        const types = await cloudAnnotations.getTypes();
        accountWorkspace.replaceAnnotationTypes(accountId, types);
        return accountWorkspace.getAnnotations(accountId).types.filter((type) => !type.deleted_at);
      },
      {
        ttlMs: SHARED_READ_TTL_MS,
        force: Boolean(syncResult && syncResult.synced),
        canUseCached: () => accountWorkspace.hasCachedAnnotationTypes(accountId),
        readCached: () => accountWorkspace.getAnnotations(accountId).types.filter((type) => !type.deleted_at)
      }
    );
  } catch (error) {
    if (!accountWorkspace.hasCachedAnnotationTypes(accountId)) throw error;
  }
  return accountWorkspace.getAnnotations(accountId).types.filter((type) => !type.deleted_at);
}

async function createAnnotationType(label, color) {
  const capabilities = await getCurrentCapabilities();
  const cloudMode = isCloudMode();
  const currentTypes = cloudMode
    ? accountWorkspace.getAnnotations(getAccountId()).types.filter((type) => !type.deleted_at)
    : localData.getTypes();
  if (currentTypes.length >= capabilities.maxAnnotationTypes) {
    throw new Error(`当前最多创建 ${capabilities.maxAnnotationTypes} 个标注类型`);
  }
  if (!cloudMode) return localData.createType(label, color);
  const accountId = getAccountId();
  const now = new Date().toISOString();
  const type = { id: createUuid(), label, color, sort_order: accountWorkspace.getAnnotations(accountId).types.length, created_at: now, updated_at: now, sync_state: 'pending' };
  const annotations = accountWorkspace.getAnnotations(accountId);
  accountWorkspace.saveAnnotations(accountId, { types: [...annotations.types, type] });
  accountWorkspace.enqueueOperation(accountId, 'annotation_type', 'create', type.id, type);
  await syncPendingRecords();
  const normalizedLabel = String(label || '').trim().toLocaleLowerCase();
  return accountWorkspace.getAnnotations(accountId).types.find((item) => (
    String(item.label || '').trim().toLocaleLowerCase() === normalizedLabel
  )) || type;
}

async function updateAnnotationType(id, updates) {
  if (!isCloudMode()) return localData.updateType(id, updates);
  const accountId = getAccountId();
  const annotations = accountWorkspace.getAnnotations(accountId);
  const current = annotations.types.find((type) => type.id === id);
  if (!current) throw new Error('没有找到这个标注类型');
  const next = { ...current, ...updates, updated_at: new Date().toISOString(), sync_state: 'pending' };
  accountWorkspace.saveAnnotations(accountId, { types: [...annotations.types.filter((type) => type.id !== id), next] });
  accountWorkspace.enqueueOperation(accountId, 'annotation_type', 'update', id, updates);
  await syncPendingRecords();
  return next;
}

async function deleteAnnotationType(id) {
  if (!isCloudMode()) return localData.deleteType(id);
  const accountId = getAccountId();
  const annotations = accountWorkspace.getAnnotations(accountId);
  accountWorkspace.saveAnnotations(accountId, {
    types: annotations.types.filter((type) => type.id !== id),
    assignments: annotations.assignments.filter((item) => item.annotation_type_id !== id)
  });
  accountWorkspace.enqueueOperation(accountId, 'annotation_type', 'delete', id);
  await syncPendingRecords();
  return true;
}

async function getMonthAssignments(year, month) {
  if (!isCloudMode()) return localData.getMonthAssignments(year, month);
  const accountId = getAccountId();
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const syncResult = await syncPendingRecords();
  try {
    return await sharedReadCache.run(
      readCacheKey(accountId, `annotation-month:${key}`),
      async () => {
        const assignments = await cloudAnnotations.getMonthAssignments(year, month);
        accountWorkspace.replaceAnnotationAssignments(accountId, key, assignments);
        return accountWorkspace.getAnnotations(accountId).assignments.filter((item) => String(item.date || '').startsWith(key));
      },
      {
        ttlMs: SHARED_READ_TTL_MS,
        force: Boolean(syncResult && syncResult.synced),
        canUseCached: () => accountWorkspace.getWorkspace(accountId).cached_annotation_months.includes(key),
        readCached: () => accountWorkspace.getAnnotations(accountId).assignments.filter((item) => String(item.date || '').startsWith(key))
      }
    );
  } catch (error) {
    if (!accountWorkspace.getWorkspace(accountId).cached_annotation_months.includes(key)) throw error;
  }
  return accountWorkspace.getAnnotations(accountId).assignments.filter((item) => String(item.date || '').startsWith(key));
}

async function addAnnotation(typeId, date) {
  if (!isCloudMode()) return localData.addAnnotation(typeId, date);
  const accountId = getAccountId();
  const annotations = accountWorkspace.getAnnotations(accountId);
  if (!annotations.assignments.some((item) => item.annotation_type_id === typeId && item.date === date)) {
    accountWorkspace.saveAnnotations(accountId, {
      assignments: [...annotations.assignments, { id: createUuid(), annotation_type_id: typeId, date, created_at: new Date().toISOString(), sync_state: 'pending' }]
    });
  }
  const key = `${typeId}:${date}`;
  accountWorkspace.enqueueOperation(accountId, 'annotation_assignment', 'create', key, { type_id: typeId, date });
  await syncPendingRecords();
  return true;
}

async function removeAnnotation(typeId, date) {
  if (!isCloudMode()) return localData.removeAnnotation(typeId, date);
  const accountId = getAccountId();
  const annotations = accountWorkspace.getAnnotations(accountId);
  accountWorkspace.saveAnnotations(accountId, {
    assignments: annotations.assignments.filter((item) => !(item.annotation_type_id === typeId && item.date === date))
  });
  accountWorkspace.enqueueOperation(accountId, 'annotation_assignment', 'delete', `${typeId}:${date}`, { type_id: typeId, date });
  await syncPendingRecords();
  return true;
}

async function buildAnnotationMap(year, month) {
  if (!isCloudMode()) return localData.buildAnnotationMap(year, month);
  const assignments = await getMonthAssignments(year, month);
  const types = await getAnnotationTypes();
  const typeMap = Object.fromEntries(types.map((type) => [type.id, type]));
  return assignments.reduce((map, item) => {
    const type = typeMap[item.annotation_type_id];
    if (!type) return map;
    if (!map[item.date]) map[item.date] = [];
    map[item.date].push({ label: type.label, color: type.color });
    return map;
  }, {});
}

async function buildAnnotatedDates(year, month) {
  if (!isCloudMode()) return localData.buildAnnotatedDates(year, month);
  const assignments = await getMonthAssignments(year, month);
  return assignments.reduce((map, item) => {
    if (!map[item.annotation_type_id]) map[item.annotation_type_id] = new Set();
    map[item.annotation_type_id].add(item.date);
    return map;
  }, {});
}

function getGuestMigrationKey(accountId = getAccountId()) {
  return `${GUEST_MIGRATION_KEY_PREFIX}:${accountId}`;
}

function hasMeaningfulGuestProfile(profile) {
  const defaults = localProfile.DEFAULT_PROFILE;
  return Boolean(
    (profile.name && profile.name !== defaults.name) ||
    (profile.signature && profile.signature !== defaults.signature) ||
    profile.avatar ||
    Number(profile.historical_days) > 0 ||
    Number(profile.historical_avg_minutes) > 0
  );
}

function getGuestMergeSummary() {
  const annotations = localData.getAllAnnotations();
  const records = localData.getAllRecords().filter((record) => (
    !record.deleted_at && record.type !== '草稿' && !record.is_tutorial
  ));
  const customOptions = localData.getOptions().filter((option) => option.is_custom);
  const profile = localProfile.getProfile();
  const accountId = getAccountId();
  const decision = accountId ? wx.getStorageSync(getGuestMigrationKey(accountId)) : null;
  const counts = {
    records: records.length,
    photos: records.reduce((sum, record) => sum + (Array.isArray(record.photos) ? record.photos.length : 0), 0),
    options: customOptions.length,
    annotation_types: annotations.types.length,
    annotation_assignments: annotations.assignments.length,
    profile: hasMeaningfulGuestProfile(profile) ? 1 : 0
  };
  const total = counts.records + counts.options + counts.annotation_types + counts.annotation_assignments + counts.profile;
  return {
    eligible: Boolean(isCloudMode() && accountId && total > 0 && !(decision && decision.decided)),
    counts,
    total,
    decision: decision || null
  };
}

function dismissGuestMerge() {
  const accountId = getAccountId();
  if (!accountId) return;
  wx.setStorageSync(getGuestMigrationKey(accountId), {
    decided: true,
    merged: false,
    at: new Date().toISOString()
  });
}

async function migrateGuestDataToAccount() {
  if (!isCloudMode()) throw new Error('请先登录账号');
  const accountId = getAccountId();
  const guestRecords = localData.getAllRecords().filter((record) => (
    !record.deleted_at && record.type !== '草稿' && !record.is_tutorial
  ));
  const guestOptions = localData.getOptions().filter((option) => option.is_custom);
  const guestProfile = localProfile.getProfile();
  const guestAnnotations = localData.getAllAnnotations();

  const [cloudRecordList, cloudOptionList, cloudProfileData, cloudTypeList] = await Promise.all([
    cloudRecords.getRecordsByDateRange('1900-01-01', '2100-12-31'),
    cloudOptions.getPracticeOptions(),
    cloudProfile.getUserProfile(),
    cloudAnnotations.getTypes()
  ]);
  accountWorkspace.replaceRecordsInRange(accountId, '1900-01-01', '2100-12-31', cloudRecordList);
  accountWorkspace.replaceOptions(accountId, cloudOptionList);
  accountWorkspace.replaceAnnotationTypes(accountId, cloudTypeList);
  if (cloudProfileData) accountWorkspace.saveProfile(accountId, cloudProfileData, true);

  const existingRecordIds = new Set(cloudRecordList.map((record) => record.id));
  guestRecords.forEach((source) => {
    if (existingRecordIds.has(source.id)) return;
    const record = { ...source, user_id: accountId, sync_state: 'pending' };
    accountWorkspace.upsertRecord(accountId, record);
    accountWorkspace.enqueueRecordOperation(accountId, 'create', record.id, {
      ...record,
      photos: getRemotePhotos(record.photos)
    });
    queuePhotoChanges(accountId, record.id, [], record.photos);
  });

  const optionLabels = new Set(cloudOptionList.map((option) => String(option.label || '').trim()));
  guestOptions.forEach((source) => {
    if (!source.label || optionLabels.has(String(source.label).trim())) return;
    const option = { ...source, id: source.id || createUuid(), user_id: accountId, sync_state: 'pending' };
    accountWorkspace.upsertOption(accountId, option);
    accountWorkspace.enqueueOperation(accountId, 'option', 'create', option.id, option);
    optionLabels.add(String(option.label).trim());
  });

  if (hasMeaningfulGuestProfile(guestProfile) && !hasMeaningfulGuestProfile(cloudProfileData || {})) {
    const profile = { ...guestProfile, user_id: accountId, updated_at: new Date().toISOString(), sync_state: 'pending' };
    accountWorkspace.saveProfile(accountId, profile, false);
    accountWorkspace.enqueueOperation(accountId, 'profile', 'update', 'profile', profile);
  }

  const typeMap = {};
  guestAnnotations.types.forEach((source) => {
    const existing = cloudTypeList.find((type) => type.label === source.label && type.color === source.color);
    if (existing) {
      typeMap[source.id] = existing.id;
      return;
    }
    const type = { ...source, id: source.id || createUuid(), user_id: accountId, sync_state: 'pending' };
    typeMap[source.id] = type.id;
    const annotations = accountWorkspace.getAnnotations(accountId);
    accountWorkspace.saveAnnotations(accountId, { types: [...annotations.types, type] });
    accountWorkspace.enqueueOperation(accountId, 'annotation_type', 'create', type.id, type);
  });
  guestAnnotations.assignments.forEach((source) => {
    const typeId = typeMap[source.annotation_type_id];
    if (!typeId) return;
    const annotations = accountWorkspace.getAnnotations(accountId);
    if (!annotations.assignments.some((item) => item.annotation_type_id === typeId && item.date === source.date)) {
      accountWorkspace.saveAnnotations(accountId, {
        assignments: [...annotations.assignments, { ...source, annotation_type_id: typeId, sync_state: 'pending' }]
      });
    }
    accountWorkspace.enqueueOperation(accountId, 'annotation_assignment', 'create', `${typeId}:${source.date}`, {
      type_id: typeId,
      date: source.date
    });
  });

  wx.setStorageSync(getGuestMigrationKey(accountId), {
    decided: true,
    merged: true,
    at: new Date().toISOString()
  });
  const result = await syncPendingRecords();
  accountWorkspace.addSyncLog(accountId, {
    stage: 'guest_merge',
    status: result.pending === 0 ? 'success' : 'queued',
    message: `本机数据合并已处理，剩余 ${result.pending} 项待同步`
  });
  return { ...result, summary: getGuestMergeSummary().counts };
}

module.exports = {
  getMode,
  invalidateSharedReads,
  ensureAccountTutorialFromGuest,
  getGuestRecordCount: localData.getActiveRecordCount,
  getGuestMergeSummary,
  dismissGuestMerge,
  migrateGuestDataToAccount,
  getPracticeOptions,
  getCachedPracticeOptions,
  addPracticeOption,
  updatePracticeOption,
  deletePracticeOption,
  getRecordsByDateRange,
  getCachedRecordsByDateRange,
  getEarliestRecordDate,
  createRecord,
  updateRecord,
  uploadRecordPhotos,
  softDeleteRecord,
  syncPendingRecords,
  syncPhotosInBackground,
  getRecordSyncState,
  getPhotoSyncStatus,
  getProfile,
  getCachedProfile,
  getCachedAnnotations,
  saveProfile,
  getAnnotationTypes,
  createAnnotationType,
  updateAnnotationType,
  deleteAnnotationType,
  getMonthAssignments,
  addAnnotation,
  removeAnnotation,
  buildAnnotationMap,
  buildAnnotatedDates
};
