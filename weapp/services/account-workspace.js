const KEY_PREFIX = 'weapp_account_workspace_v1';
const photoStorage = require('./photo-storage');

function normalizeAccountId(accountId) {
  const value = String(accountId || '').trim();
  if (!value) throw new Error('缺少账号 ID');
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getWorkspaceKey(accountId) {
  return `${KEY_PREFIX}:${normalizeAccountId(accountId)}`;
}

function emptyWorkspace(accountId) {
  return {
    version: 1,
    account_id: String(accountId),
    records: [],
    options: [],
    profile: null,
    annotations: { types: [], assignments: [] },
    pending_operations: [],
    cached_ranges: [],
    cached_annotation_months: [],
    annotation_types_cached: false,
    options_cached: false,
    profile_cached: false,
    sync_logs: [],
    last_sync_at: null,
    last_sync_status: 'idle',
    updated_at: null
  };
}

function getWorkspace(accountId) {
  const stored = wx.getStorageSync(getWorkspaceKey(accountId));
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return emptyWorkspace(accountId);
  }
  return {
    ...emptyWorkspace(accountId),
    ...stored,
    account_id: String(accountId),
    records: Array.isArray(stored.records) ? stored.records : [],
    options: Array.isArray(stored.options) ? stored.options : [],
    profile: stored.profile && typeof stored.profile === 'object' ? stored.profile : null,
    annotations: {
      types: stored.annotations && Array.isArray(stored.annotations.types) ? stored.annotations.types : [],
      assignments: stored.annotations && Array.isArray(stored.annotations.assignments) ? stored.annotations.assignments : []
    },
    pending_operations: Array.isArray(stored.pending_operations) ? stored.pending_operations : [],
    cached_ranges: Array.isArray(stored.cached_ranges) ? stored.cached_ranges : [],
    cached_annotation_months: Array.isArray(stored.cached_annotation_months) ? stored.cached_annotation_months : [],
    sync_logs: Array.isArray(stored.sync_logs) ? stored.sync_logs : []
  };
}

function saveWorkspace(accountId, updates) {
  const workspace = {
    ...getWorkspace(accountId),
    ...updates,
    account_id: String(accountId),
    updated_at: new Date().toISOString()
  };
  wx.setStorageSync(getWorkspaceKey(accountId), workspace);
  return workspace;
}

function rangeKey(startDate, endDate) {
  return `${startDate}:${endDate}`;
}

function replaceRecordsInRange(accountId, startDate, endDate, records) {
  const workspace = getWorkspace(accountId);
  const pendingRecordIds = new Set(workspace.pending_operations
    .map((operation) => operation.record_id || (operation.payload && operation.payload.record_id))
    .filter(Boolean));
  const outsideRange = workspace.records.filter((record) => (
    !record.date || record.date < startDate || record.date > endDate
  ));
  const pendingInRange = workspace.records.filter((record) => (
    pendingRecordIds.has(record.id) && record.date >= startDate && record.date <= endDate
  ));
  const tutorialInRange = workspace.records.filter((record) => (
    record.is_tutorial && record.date >= startDate && record.date <= endDate
  ));
  const cloudRecords = (Array.isArray(records) ? records : []).filter((record) => !pendingRecordIds.has(record.id));
  const nextRecords = [...outsideRange, ...cloudRecords, ...pendingInRange, ...tutorialInRange]
    .filter((record, index, all) => all.findIndex((item) => item.id === record.id) === index)
    .sort((a, b) => (
      String(a.date || '').localeCompare(String(b.date || '')) ||
      String(a.created_at || '').localeCompare(String(b.created_at || ''))
    ));
  const key = rangeKey(startDate, endDate);
  const cachedRanges = workspace.cached_ranges.includes(key)
    ? workspace.cached_ranges
    : [...workspace.cached_ranges, key];
  return saveWorkspace(accountId, { records: nextRecords, cached_ranges: cachedRanges });
}

function hasCachedRange(accountId, startDate, endDate) {
  return getWorkspace(accountId).cached_ranges.includes(rangeKey(startDate, endDate));
}

function getRecordsByDateRange(accountId, startDate, endDate) {
  return getWorkspace(accountId).records
    .filter((record) => !record.deleted_at && record.date >= startDate && record.date <= endDate)
    .sort((a, b) => (
      String(a.date || '').localeCompare(String(b.date || '')) ||
      String(a.created_at || '').localeCompare(String(b.created_at || ''))
    ));
}

function replaceOptions(accountId, options) {
  const workspace = getWorkspace(accountId);
  const pendingIds = new Set(workspace.pending_operations
    .filter((operation) => operation.entity === 'option')
    .map((operation) => operation.entity_id));
  const pendingOptions = workspace.options.filter((option) => pendingIds.has(option.id));
  const cloudOptions = (Array.isArray(options) ? options : []).filter((option) => !pendingIds.has(option.id));
  return saveWorkspace(accountId, {
    options: [...cloudOptions, ...pendingOptions],
    options_cached: true
  });
}

function hasCachedOptions(accountId) {
  return Boolean(getWorkspace(accountId).options_cached);
}

function getOptions(accountId) {
  return getWorkspace(accountId).options.filter((option) => !option.deleted_at);
}

function upsertOption(accountId, option) {
  const workspace = getWorkspace(accountId);
  return saveWorkspace(accountId, {
    options: [...workspace.options.filter((item) => item.id !== option.id), option]
  });
}

function getOption(accountId, optionId) {
  return getWorkspace(accountId).options.find((option) => option.id === optionId) || null;
}

function updateLocalOption(accountId, optionId, updates) {
  const current = getOption(accountId, optionId);
  if (!current) throw new Error('本机工作区中找不到该练习类型');
  const next = { ...current, ...updates, id: optionId, updated_at: new Date().toISOString(), sync_state: 'pending' };
  upsertOption(accountId, next);
  return next;
}

function markOptionDeleted(accountId, optionId) {
  return updateLocalOption(accountId, optionId, { deleted_at: new Date().toISOString() });
}

function markOptionSynced(accountId, option) {
  return upsertOption(accountId, { ...option, sync_state: 'synced' });
}

function getProfile(accountId) {
  return getWorkspace(accountId).profile;
}

function hasCachedProfile(accountId) {
  return Boolean(getWorkspace(accountId).profile_cached);
}

function saveProfile(accountId, profile, synced = false) {
  return saveWorkspace(accountId, {
    profile: { ...profile, sync_state: synced ? 'synced' : 'pending' },
    profile_cached: true
  });
}

function getAnnotations(accountId) {
  return getWorkspace(accountId).annotations;
}

function replaceAnnotationTypes(accountId, types) {
  const workspace = getWorkspace(accountId);
  const pendingIds = new Set(workspace.pending_operations
    .filter((operation) => operation.entity === 'annotation_type')
    .map((operation) => operation.entity_id));
  const pendingTypes = workspace.annotations.types.filter((type) => pendingIds.has(type.id));
  const cloudTypes = (Array.isArray(types) ? types : []).filter((type) => !pendingIds.has(type.id));
  return saveWorkspace(accountId, {
    annotations: { ...workspace.annotations, types: [...cloudTypes, ...pendingTypes] },
    annotation_types_cached: true
  });
}

function hasCachedAnnotationTypes(accountId) {
  return Boolean(getWorkspace(accountId).annotation_types_cached);
}

function replaceAnnotationAssignments(accountId, monthKey, assignments) {
  const workspace = getWorkspace(accountId);
  const pendingKeys = new Set(workspace.pending_operations
    .filter((operation) => operation.entity === 'annotation_assignment')
    .map((operation) => `${operation.payload.type_id}:${operation.payload.date}`));
  const outsideMonth = workspace.annotations.assignments.filter((item) => !String(item.date || '').startsWith(monthKey));
  const pendingInMonth = workspace.annotations.assignments.filter((item) => (
    String(item.date || '').startsWith(monthKey) && pendingKeys.has(`${item.annotation_type_id}:${item.date}`)
  ));
  const cloudAssignments = (Array.isArray(assignments) ? assignments : []).filter((item) => (
    !pendingKeys.has(`${item.annotation_type_id}:${item.date}`)
  ));
  const cached = workspace.cached_annotation_months.includes(monthKey)
    ? workspace.cached_annotation_months
    : [...workspace.cached_annotation_months, monthKey];
  return saveWorkspace(accountId, {
    annotations: { ...workspace.annotations, assignments: [...outsideMonth, ...cloudAssignments, ...pendingInMonth] },
    cached_annotation_months: cached
  });
}

function saveAnnotations(accountId, annotations) {
  const workspace = getWorkspace(accountId);
  return saveWorkspace(accountId, { annotations: { ...workspace.annotations, ...annotations } });
}

function remapAnnotationTypeId(accountId, localId, remoteType) {
  const workspace = getWorkspace(accountId);
  return saveWorkspace(accountId, {
    annotations: {
      types: [...workspace.annotations.types.filter((type) => type.id !== localId), remoteType],
      assignments: workspace.annotations.assignments.map((item) => (
        item.annotation_type_id === localId ? { ...item, annotation_type_id: remoteType.id } : item
      ))
    },
    pending_operations: workspace.pending_operations.map((operation) => (
      operation.entity === 'annotation_assignment' && operation.payload.type_id === localId
        ? { ...operation, payload: { ...operation.payload, type_id: remoteType.id } }
        : operation
    ))
  });
}

function upsertRecord(accountId, record) {
  if (!record || !record.id) return getWorkspace(accountId);
  const workspace = getWorkspace(accountId);
  const nextRecords = workspace.records.filter((item) => item.id !== record.id);
  nextRecords.push(record);
  return saveWorkspace(accountId, { records: nextRecords });
}

function getRecord(accountId, recordId) {
  return getWorkspace(accountId).records.find((record) => record.id === recordId) || null;
}

function updateLocalRecord(accountId, recordId, updates) {
  const workspace = getWorkspace(accountId);
  const current = workspace.records.find((record) => record.id === recordId);
  if (!current) throw new Error('本机工作区中找不到该练习记录');
  const next = {
    ...current,
    ...updates,
    id: recordId,
    updated_at: updates.updated_at || new Date().toISOString(),
    sync_state: 'pending'
  };
  upsertRecord(accountId, next);
  return next;
}

function updateLocalOnlyRecord(accountId, recordId, updates) {
  const current = getRecord(accountId, recordId);
  if (!current) throw new Error('本机工作区中找不到该练习记录');
  const next = {
    ...current,
    ...updates,
    id: recordId,
    updated_at: updates.updated_at || new Date().toISOString(),
    sync_state: 'local'
  };
  upsertRecord(accountId, next);
  return next;
}

function createOperationId() {
  return `op-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function enqueueOperation(accountId, entity, action, entityId, payload = {}) {
  const workspace = getWorkspace(accountId);
  let operations = [...workspace.pending_operations];
  const exactIndex = operations.findIndex((operation) => (
    operation.entity === entity && operation.entity_id === entityId && operation.action === action
  ));
  const createIndex = operations.findIndex((operation) => operation.entity === entity && operation.entity_id === entityId && operation.action === 'create');
  const updateIndex = operations.findIndex((operation) => operation.entity === entity && operation.entity_id === entityId && operation.action === 'update');
  const deleteIndex = operations.findIndex((operation) => operation.entity === entity && operation.entity_id === entityId && operation.action === 'delete');

  if (!['create', 'update', 'delete'].includes(action) && exactIndex >= 0) {
    operations[exactIndex] = {
      ...operations[exactIndex],
      payload: { ...operations[exactIndex].payload, ...payload }
    };
  } else if (action === 'update' && createIndex >= 0) {
    operations[createIndex] = { ...operations[createIndex], payload: { ...operations[createIndex].payload, ...payload } };
  } else if (action === 'update' && updateIndex >= 0) {
    operations[updateIndex] = { ...operations[updateIndex], payload: { ...operations[updateIndex].payload, ...payload } };
  } else if (action === 'delete' && deleteIndex >= 0) {
    return workspace;
  } else {
    if (action === 'delete') {
      operations = operations.filter((operation) => !(
        operation.entity === entity && operation.entity_id === entityId && operation.action === 'update'
      ));
    }
    operations.push({
      id: createOperationId(), entity, entity_id: entityId, action,
      payload: { ...payload }, attempts: 0, last_error: '', created_at: new Date().toISOString()
    });
  }
  return saveWorkspace(accountId, { pending_operations: operations });
}

function replaceRecordPhoto(accountId, recordId, oldPath, nextPath) {
  const record = getRecord(accountId, recordId);
  if (!record) return null;
  const photos = (Array.isArray(record.photos) ? record.photos : [])
    .map((path) => (path === oldPath ? nextPath : path))
    .filter(Boolean);
  const next = { ...record, photos: [...new Set(photos)] };
  upsertRecord(accountId, next);
  return next;
}

function enqueueRecordOperation(accountId, action, recordId, payload = {}) {
  const workspace = getWorkspace(accountId);
  const operations = [...workspace.pending_operations];
  const createIndex = operations.findIndex((operation) => operation.record_id === recordId && operation.action === 'create');
  const updateIndex = operations.findIndex((operation) => operation.record_id === recordId && operation.action === 'update');

  if (action === 'create') {
    const operation = {
      id: createOperationId(), entity: 'record', action, record_id: recordId,
      payload: { ...payload }, attempts: 0, last_error: '', created_at: new Date().toISOString()
    };
    operations.push(operation);
  } else if (action === 'update' && createIndex >= 0) {
    operations[createIndex] = {
      ...operations[createIndex],
      payload: { ...operations[createIndex].payload, ...payload }
    };
  } else if (action === 'update' && updateIndex >= 0) {
    operations[updateIndex] = {
      ...operations[updateIndex],
      payload: { ...operations[updateIndex].payload, ...payload }
    };
  } else {
    const withoutOldUpdates = action === 'delete'
      ? operations.filter((operation) => !(operation.record_id === recordId && operation.action === 'update'))
      : operations;
    withoutOldUpdates.push({
      id: createOperationId(), entity: 'record', action, record_id: recordId,
      payload: { ...payload }, attempts: 0, last_error: '', created_at: new Date().toISOString()
    });
    return saveWorkspace(accountId, { pending_operations: withoutOldUpdates });
  }
  return saveWorkspace(accountId, { pending_operations: operations });
}

function addSyncLog(accountId, entry) {
  const workspace = getWorkspace(accountId);
  const log = { at: new Date().toISOString(), ...entry };
  return saveWorkspace(accountId, { sync_logs: [log, ...workspace.sync_logs].slice(0, 100) });
}

function finishSync(accountId, status) {
  return saveWorkspace(accountId, {
    last_sync_at: new Date().toISOString(),
    last_sync_status: status
  });
}

function getPendingOperations(accountId) {
  return getWorkspace(accountId).pending_operations;
}

function removePendingOperation(accountId, operationId) {
  const workspace = getWorkspace(accountId);
  return saveWorkspace(accountId, {
    pending_operations: workspace.pending_operations.filter((operation) => operation.id !== operationId)
  });
}

function removePendingOperations(accountId, predicate) {
  const workspace = getWorkspace(accountId);
  return saveWorkspace(accountId, {
    pending_operations: workspace.pending_operations.filter((operation) => !predicate(operation))
  });
}

function markOperationFailed(accountId, operationId, error) {
  const workspace = getWorkspace(accountId);
  return saveWorkspace(accountId, {
    pending_operations: workspace.pending_operations.map((operation) => (
      operation.id === operationId
        ? { ...operation, attempts: Number(operation.attempts || 0) + 1, last_error: String(error && error.message ? error.message : error || '同步失败') }
        : operation
    ))
  });
}

function markRecordSynced(accountId, record) {
  const current = getRecord(accountId, record && record.id);
  const remotePhotos = Array.isArray(record && record.photos)
    ? record.photos.filter(photoStorage.isRemotePhoto)
    : [];
  const pendingLocalPhotos = current && Array.isArray(current.photos)
    ? current.photos.filter(photoStorage.isLocalPhoto)
    : [];
  return upsertRecord(accountId, {
    ...(current || {}),
    ...record,
    photos: [...new Set([...remotePhotos, ...pendingLocalPhotos])],
    sync_state: 'synced'
  });
}

function markRecordDeleted(accountId, recordId) {
  const workspace = getWorkspace(accountId);
  const now = new Date().toISOString();
  return saveWorkspace(accountId, {
    records: workspace.records.map((record) => (
      record.id === recordId
        ? { ...record, deleted_at: now, updated_at: now, sync_state: 'pending' }
        : record
    ))
  });
}

module.exports = {
  KEY_PREFIX,
  getWorkspaceKey,
  getWorkspace,
  replaceRecordsInRange,
  hasCachedRange,
  getRecordsByDateRange,
  replaceOptions,
  hasCachedOptions,
  getOptions,
  upsertOption,
  getOption,
  updateLocalOption,
  markOptionDeleted,
  markOptionSynced,
  getProfile,
  hasCachedProfile,
  saveProfile,
  getAnnotations,
  replaceAnnotationTypes,
  hasCachedAnnotationTypes,
  replaceAnnotationAssignments,
  saveAnnotations,
  remapAnnotationTypeId,
  upsertRecord,
  getRecord,
  updateLocalRecord,
  updateLocalOnlyRecord,
  markRecordDeleted,
  enqueueRecordOperation,
  enqueueOperation,
  getPendingOperations,
  removePendingOperation,
  removePendingOperations,
  markOperationFailed,
  markRecordSynced,
  replaceRecordPhoto,
  addSyncLog,
  finishSync
};
