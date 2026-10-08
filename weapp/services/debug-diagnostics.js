const auth = require('./auth');
const localData = require('./local-data');
const localProfile = require('./local-profile');
const accountWorkspace = require('./account-workspace');
const membershipService = require('./membership');
const photoStorage = require('./photo-storage');
const runtimeErrors = require('./runtime-errors');
const cloudRecords = require('./practice-records');
const cloudOptions = require('./practice-options');
const cloudProfile = require('./user-profile');
const cloudAnnotations = require('./cloud-annotations');

const PHOTO_HEALTH_LIMIT = 12;
const PHOTO_HEALTH_CONCURRENCY = 4;
const PHOTO_HEAD_TIMEOUT_MS = 3000;

function sanitizeForExport(value, depth = 0, key = '') {
  if (depth > 8) return '[max-depth]';
  if (/password|verification.?code|reset.?code|otp|token|authorization|cookie|secret|signature|paysig|signdata|session_key|appkey/i.test(key)) {
    if (typeof value === 'boolean') return value;
    return '[redacted]';
  }
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return runtimeErrors.redactText(value, 20000);
  if (Array.isArray(value)) return value.map((item) => sanitizeForExport(item, depth + 1, key));
  if (typeof value === 'object') {
    return Object.keys(value).reduce((result, childKey) => {
      result[childKey] = sanitizeForExport(value[childKey], depth + 1, childKey);
      return result;
    }, {});
  }
  return runtimeErrors.redactText(value, 20000);
}

function summarizeBy(items, getKey) {
  return items.reduce((summary, item) => {
    const key = String(getKey(item) || 'unknown');
    summary[key] = Number(summary[key] || 0) + 1;
    return summary;
  }, {});
}

function mapRecord(record, pendingOperations) {
  const operations = pendingOperations.filter((operation) => (
    (operation.record_id || operation.entity_id || (operation.payload && operation.payload.record_id)) === record.id
  ));
  const photos = Array.isArray(record.photos) ? record.photos : [];
  return sanitizeForExport({
    id: record.id,
    user_id: record.user_id || null,
    date: record.date,
    type: record.type,
    duration: record.duration,
    notes: record.notes || '',
    breakthrough: record.breakthrough || null,
    start_time: record.start_time || null,
    color_level: record.color_level,
    photos,
    photos_count: photos.length,
    photos_remote: photos.filter(photoStorage.isRemotePhoto).length,
    photos_local: photos.filter(photoStorage.isLocalPhoto).length,
    is_tutorial: Boolean(record.is_tutorial),
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    deleted_at: record.deleted_at || null,
    sync_state: record.sync_state || 'unknown',
    pending_operations: operations.map((operation) => ({
      id: operation.id,
      entity: operation.entity || 'record',
      action: operation.action,
      attempts: operation.attempts || 0,
      last_error: operation.last_error || '',
      created_at: operation.created_at
    }))
  });
}

function findDuplicateGroups(records, buildKey) {
  const groups = records.reduce((result, record) => {
    const key = buildKey(record);
    if (!key) return result;
    if (!result[key]) result[key] = [];
    result[key].push(record.id);
    return result;
  }, {});
  return Object.keys(groups)
    .filter((key) => groups[key].length > 1)
    .map((key) => ({ key, record_ids: groups[key] }));
}

function getStorageDiagnostics() {
  let info = {};
  try {
    info = typeof wx.getStorageInfoSync === 'function' ? wx.getStorageInfoSync() || {} : {};
  } catch (error) {
    return { error: error && error.message ? error.message : String(error), keys: [] };
  }
  const keys = Array.isArray(info.keys) ? info.keys : [];
  return {
    current_size_kb: info.currentSize,
    limit_size_kb: info.limitSize,
    total_keys: keys.length,
    key_details: keys.map((key) => {
      try {
        const value = wx.getStorageSync(key);
        return { key, estimated_bytes: JSON.stringify(value === undefined ? null : value).length };
      } catch (error) {
        return { key, error: error && error.message ? error.message : String(error) };
      }
    })
  };
}

function getEventDiagnostics() {
  const events = runtimeErrors.getRecentEvents(240);
  const network = events.filter((event) => event.category === 'network' && event.details && event.details.target);
  const networkByTarget = network.reduce((result, event) => {
    const target = event.details.target;
    if (!result[target]) result[target] = { count: 0, failures: 0, total_ms: 0, max_ms: 0, statuses: {} };
    const row = result[target];
    const duration = Number(event.details.duration_ms) || 0;
    row.count += 1;
    row.total_ms += duration;
    row.max_ms = Math.max(row.max_ms, duration);
    if (event.name !== 'request_completed') row.failures += 1;
    const status = String(event.details.status_code || 'network_error');
    row.statuses[status] = Number(row.statuses[status] || 0) + 1;
    return result;
  }, {});
  return {
    network_by_target: sanitizeForExport(networkByTarget),
    page_performance: events.filter((event) => event.category === 'page'),
    auth_logs: events.filter((event) => event.category === 'auth'),
    photo_logs: events.filter((event) => event.category === 'photo'),
    sync_logs: events.filter((event) => event.category === 'sync'),
    membership_and_payment_logs: events.filter((event) => event.category === 'payment' || (
      event.category === 'network' && event.details && /\/api\/membership\//.test(event.details.target || '')
    )),
    asset_logs: events.filter((event) => event.category === 'asset')
  };
}

function collectSnapshot(pageState = {}) {
  const session = auth.getStoredSession();
  const accountId = session && session.user ? session.user.id : '';
  const cloudMode = pageState.dataMode === 'cloud' && Boolean(accountId);
  const workspace = cloudMode ? accountWorkspace.getWorkspace(accountId) : null;
  const records = workspace ? workspace.records : localData.getAllRecords();
  const options = workspace ? workspace.options : localData.getOptions();
  const profile = workspace ? workspace.profile : localProfile.getProfile();
  const annotations = workspace ? workspace.annotations : localData.getAllAnnotations();
  const pending = workspace ? workspace.pending_operations : [];
  const syncLogs = workspace ? workspace.sync_logs : [];
  const recordIds = new Set(records.map((record) => record.id));
  const user = session && session.user ? session.user : null;
  const expiresAt = Number(session && session.expires_at) || 0;
  const cachedMembershipEnvelope = wx.getStorageSync(membershipService.CACHE_KEY);
  const conflictLogs = syncLogs.filter((log) => log.stage === 'conflict' || log.status === 'resolved');
  const failedLogs = syncLogs.filter((log) => log.status === 'error');

  return {
    auth_diagnostics: sanitizeForExport({
      is_logged_in: Boolean(session),
      data_mode: pageState.dataMode || 'local',
      account_mode_enabled: Boolean(wx.getStorageSync('weapp_account_mode_enabled')),
      guest_mode_enabled: Boolean(wx.getStorageSync('weapp_guest_mode_enabled')),
      access_token_present: Boolean(session && session.access_token),
      refresh_token_present: Boolean(session && session.refresh_token),
      expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
      expires_in_seconds: expiresAt ? expiresAt - Math.floor(Date.now() / 1000) : null,
      user: user ? {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
        app_metadata: user.app_metadata || null,
        user_metadata: user.user_metadata || null
      } : null
    }),
    records_snapshot: {
      summary: {
        total: records.length,
        active: records.filter((record) => !record.deleted_at).length,
        deleted: records.filter((record) => record.deleted_at).length,
        tutorial: records.filter((record) => record.is_tutorial).length,
        with_notes: records.filter((record) => String(record.notes || '').trim()).length,
        with_photos: records.filter((record) => Array.isArray(record.photos) && record.photos.length).length,
        by_sync_state: summarizeBy(records, (record) => record.sync_state || 'unknown'),
        by_color_level: summarizeBy(records, (record) => record.color_level || 'unset'),
        duplicate_ids: findDuplicateGroups(records, (record) => record.id),
        possible_semantic_duplicates: findDuplicateGroups(records, (record) => (
          `${record.date || ''}|${record.type || ''}|${Number(record.duration) || 0}|${String(record.notes || '')}`
        ))
      },
      all: records.map((record) => mapRecord(record, pending))
    },
    guest_records_snapshot: cloudMode
      ? localData.getAllRecords().map((record) => mapRecord(record, []))
      : [],
    options_snapshot: {
      summary: {
        total: options.length,
        custom: options.filter((option) => option.is_custom).length,
        deleted: options.filter((option) => option.deleted_at).length,
        by_color_level: summarizeBy(options, (option) => option.color_level || 'unset')
      },
      all: sanitizeForExport(options)
    },
    profile_snapshot: sanitizeForExport(profile),
    annotations_snapshot: sanitizeForExport(annotations),
    sync_diagnostics: workspace ? sanitizeForExport({
      workspace_version: workspace.version,
      workspace_updated_at: workspace.updated_at,
      last_sync_at: workspace.last_sync_at,
      last_sync_status: workspace.last_sync_status,
      cached_record_ranges: workspace.cached_ranges,
      cached_annotation_months: workspace.cached_annotation_months,
      options_cached: workspace.options_cached,
      profile_cached: workspace.profile_cached,
      pending_count: pending.length,
      pending_by_entity: summarizeBy(pending, (operation) => operation.entity || 'record'),
      pending_by_action: summarizeBy(pending, (operation) => operation.action),
      pending_operations: pending,
      orphan_operations: pending.filter((operation) => {
        const entity = operation.entity || 'record';
        if (!['record', 'photo'].includes(entity)) return false;
        const recordId = operation.record_id || operation.entity_id || (operation.payload && operation.payload.record_id);
        return recordId && !recordIds.has(recordId);
      }),
      conflict_logs: conflictLogs,
      failed_logs: failedLogs,
      all_sync_logs: syncLogs
    }) : {
      mode: 'guest',
      pending_count: 0,
      pending_operations: [],
      conflict_logs: [],
      failed_logs: [],
      all_sync_logs: []
    },
    membership_diagnostics: sanitizeForExport({
      cached_envelope: cachedMembershipEnvelope || null,
      cached_status: membershipService.getCachedStatus(session),
      page_state: {
        is_pro: pageState.isPro,
        membership_type: pageState.membershipType,
        membership_expires_at: pageState.membershipExpiresAt,
        membership_days_remaining: pageState.membershipDaysRemaining,
        membership_loading: pageState.membershipLoading
      }
    }),
    storage_diagnostics: getStorageDiagnostics(),
    runtime_sections: getEventDiagnostics()
  };
}

function getLocalFileHealth(candidate) {
  return new Promise((resolve) => {
    const manager = wx.getFileSystemManager && wx.getFileSystemManager();
    if (!manager || typeof manager.stat !== 'function') {
      resolve({ ...candidate, diagnosis: 'LOCAL_FILE_STAT_UNSUPPORTED' });
      return;
    }
    manager.stat({
      path: candidate.url,
      success(result) {
        const size = Number(result && result.stats && result.stats.size) || 0;
        resolve({
          ...candidate,
          diagnosis: size > 0 ? 'LOCAL_FILE_HEALTHY' : 'LOCAL_FILE_ZERO_BYTE',
          content_length: size
        });
      },
      fail(error) {
        resolve({
          ...candidate,
          diagnosis: 'LOCAL_FILE_MISSING',
          error: error && error.errMsg ? error.errMsg : String(error || '')
        });
      }
    });
  });
}

function getRemotePhotoHealth(candidate) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    wx.request({
      url: candidate.url,
      method: 'HEAD',
      timeout: PHOTO_HEAD_TIMEOUT_MS,
      success(response) {
        const headers = response.header || {};
        const length = Number(headers['content-length'] || headers['Content-Length']);
        const contentType = headers['content-type'] || headers['Content-Type'] || null;
        let diagnosis = 'OSS_OBJECT_HEALTHY';
        if (response.statusCode === 403) diagnosis = 'OSS_ACCESS_DENIED';
        else if (response.statusCode === 404) diagnosis = 'OSS_OBJECT_MISSING';
        else if (response.statusCode < 200 || response.statusCode >= 300) diagnosis = `OSS_HTTP_${response.statusCode}`;
        else if (Number.isFinite(length) && length === 0) diagnosis = 'OSS_ZERO_BYTE_OBJECT';
        else if (contentType && !String(contentType).toLowerCase().startsWith('image/')) diagnosis = 'OSS_INVALID_CONTENT_TYPE';
        resolve(sanitizeForExport({
          ...candidate,
          diagnosis,
          http_status: response.statusCode,
          content_length: Number.isFinite(length) ? length : null,
          content_type: contentType,
          etag: headers.etag || headers.ETag || null,
          duration_ms: Date.now() - startedAt
        }));
      },
      fail(error) {
        resolve(sanitizeForExport({
          ...candidate,
          diagnosis: /timeout/i.test(error && error.errMsg ? error.errMsg : '')
            ? 'OSS_HEAD_TIMEOUT'
            : 'OSS_HEAD_NETWORK_OR_DOMAIN_ERROR',
          duration_ms: Date.now() - startedAt,
          error: error && error.errMsg ? error.errMsg : String(error || '')
        }));
      }
    });
  });
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function collectPhotoDiagnostics(records, pendingOperations) {
  const rawReferences = [];
  records.forEach((record) => {
    (Array.isArray(record.photos) ? record.photos : []).forEach((url, index) => {
      const operation = pendingOperations.find((item) => item.entity === 'photo' && item.payload && (
        item.payload.local_path === url || item.payload.oss_url === url
      ));
      rawReferences.push({
        record_id: record.id,
        record_date: record.date,
        index,
        url,
        source: photoStorage.isRemotePhoto(url) ? 'remote' : 'local',
        pending_operation: operation || null
      });
    });
  });
  const allReferences = rawReferences.map((reference) => sanitizeForExport(reference));
  const seen = new Set();
  const candidates = [];
  [...rawReferences].sort((a, b) => String(b.record_date || '').localeCompare(String(a.record_date || '')))
    .forEach((reference) => {
      if (!reference.url || seen.has(reference.url) || candidates.length >= PHOTO_HEALTH_LIMIT) return;
      seen.add(reference.url);
      candidates.push(reference);
    });
  const health = await mapWithConcurrency(candidates, PHOTO_HEALTH_CONCURRENCY, (candidate) => (
    candidate.source === 'remote' ? getRemotePhotoHealth(candidate) : getLocalFileHealth(candidate)
  ));
  const diagnosisCounts = summarizeBy(health, (item) => item.diagnosis);
  const problemCount = health.filter((item) => !/HEALTHY$/.test(item.diagnosis || '')).length;
  return {
    summary: {
      total_references: allReferences.length,
      unique_references: new Set(rawReferences.map((item) => item.url)).size,
      remote: allReferences.filter((item) => item.source === 'remote').length,
      local: allReferences.filter((item) => item.source === 'local').length,
      health_limit: PHOTO_HEALTH_LIMIT,
      checked: health.length,
      problems: problemCount,
      diagnosis_counts: diagnosisCounts,
      primary_diagnosis: problemCount ? health.find((item) => !/HEALTHY$/.test(item.diagnosis || '')).diagnosis : health.length ? 'ALL_CHECKED_PHOTOS_HEALTHY' : 'NO_PHOTOS'
    },
    all_references: allReferences,
    health_checks: health
  };
}

async function withDiagnosticTimeout(label, task, fallback, timeoutMs = 5000) {
  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ ...fallback, diagnostic_timeout: label }), timeoutMs);
      })
    ]);
  } catch (error) {
    return { ...fallback, error: error && error.message ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function compareRecordSnapshots(localRecords, remoteRecords, pendingOperations) {
  const localById = new Map(localRecords.map((record) => [record.id, record]));
  const remoteById = new Map(remoteRecords.map((record) => [record.id, record]));
  const allIds = [...new Set([...localById.keys(), ...remoteById.keys()])];
  const rows = allIds.map((id) => {
    const local = localById.get(id) || null;
    const remote = remoteById.get(id) || null;
    const pending = pendingOperations.filter((operation) => (
      (operation.record_id || operation.entity_id || (operation.payload && operation.payload.record_id)) === id
    ));
    const fields = ['date', 'type', 'duration', 'notes', 'breakthrough', 'color_level', 'deleted_at'];
    const changedFields = local && remote
      ? fields.filter((field) => JSON.stringify(local[field] ?? null) !== JSON.stringify(remote[field] ?? null))
      : [];
    if (local && remote && JSON.stringify(local.photos || []) !== JSON.stringify(remote.photos || [])) changedFields.push('photos');
    const localTime = Date.parse(local && local.updated_at ? local.updated_at : '') || 0;
    const remoteTime = Date.parse(remote && remote.updated_at ? remote.updated_at : '') || 0;
    return sanitizeForExport({
      record_id: id,
      state: !local ? 'remote_only' : !remote ? 'local_only' : changedFields.length ? 'divergent' : 'matched',
      changed_fields: changedFields,
      local_updated_at: local && local.updated_at,
      remote_updated_at: remote && remote.updated_at,
      newer_side: localTime === remoteTime ? 'same_time' : localTime > remoteTime ? 'local' : 'remote',
      has_pending_operation: pending.length > 0,
      pending_operations: pending,
      local_record: local,
      remote_record: remote
    });
  });
  return {
    summary: summarizeBy(rows, (row) => row.state),
    rows
  };
}

async function collectCloudDiagnostics(pageState = {}) {
  const session = auth.getStoredSession();
  const accountId = session && session.user ? session.user.id : '';
  if (pageState.dataMode !== 'cloud' || !accountId) {
    return { available: false, reason: 'not_in_cloud_mode' };
  }
  const workspace = accountWorkspace.getWorkspace(accountId);
  const months = [...new Set(workspace.cached_annotation_months || [])];
  const safeCollect = async (label, task, fallback) => {
    try {
      return await task;
    } catch (error) {
      return { diagnostic_error: label, message: error && error.message ? error.message : String(error), fallback };
    }
  };
  const [recordsResult, optionsResult, profileResult, typesResult, assignmentResults] = await Promise.all([
    safeCollect('cloud_records', cloudRecords.getRecordsByDateRange('1900-01-01', '2100-12-31'), []),
    safeCollect('cloud_options', cloudOptions.getPracticeOptions(), []),
    safeCollect('cloud_profile', cloudProfile.getUserProfile(), null),
    safeCollect('cloud_annotation_types', cloudAnnotations.getTypes(), []),
    Promise.all(months.map(async (monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      const assignments = await safeCollect(
        `cloud_annotation_assignments_${monthKey}`,
        cloudAnnotations.getMonthAssignments(year, month),
        []
      );
      return { month: monthKey, assignments };
    }))
  ]);
  const remoteRecords = Array.isArray(recordsResult) ? recordsResult : [];
  const comparison = compareRecordSnapshots(workspace.records, remoteRecords, workspace.pending_operations);
  return sanitizeForExport({
    available: true,
    collected_at: new Date().toISOString(),
    scope: {
      records: 'all active records from 1900-01-01 to 2100-12-31',
      annotations: 'cached months only',
      cached_annotation_months: months
    },
    records: recordsResult,
    options: optionsResult,
    profile: profileResult,
    annotation_types: typesResult,
    annotation_assignments_by_month: assignmentResults,
    merge_comparison: comparison
  });
}

async function collectAsyncDiagnostics(snapshot, pageState = {}) {
  const session = auth.getStoredSession();
  const accountId = session && session.user ? session.user.id : '';
  const workspace = pageState.dataMode === 'cloud' && accountId ? accountWorkspace.getWorkspace(accountId) : null;
  const records = workspace ? workspace.records : localData.getAllRecords();
  const pending = workspace ? workspace.pending_operations : [];
  const [photoDiagnostics, currentMembership, cloudDiagnostics] = await Promise.all([
    withDiagnosticTimeout('照片健康检查', collectPhotoDiagnostics(records, pending), {
      summary: { primary_diagnosis: 'PHOTO_HEALTH_CHECK_TIMEOUT', checked: 0 },
      all_references: [],
      health_checks: []
    }, 10000),
    session
      ? withDiagnosticTimeout('会员状态', membershipService.getMembershipStatus(), {
        error: 'MEMBERSHIP_STATUS_TIMEOUT'
      })
      : Promise.resolve(membershipService.EMPTY_STATUS),
    withDiagnosticTimeout('云端快照与合并对照', collectCloudDiagnostics(pageState), {
      available: false,
      error: 'CLOUD_DIAGNOSTICS_TIMEOUT'
    }, 10000)
  ]);
  return {
    ...snapshot,
    photo_diagnostics: photoDiagnostics,
    membership_diagnostics: {
      ...snapshot.membership_diagnostics,
      current_server_or_cache_status: sanitizeForExport(currentMembership)
    },
    cloud_diagnostics: cloudDiagnostics
  };
}

module.exports = {
  PHOTO_HEALTH_LIMIT,
  PHOTO_HEALTH_CONCURRENCY,
  PHOTO_HEAD_TIMEOUT_MS,
  sanitizeForExport,
  collectSnapshot,
  compareRecordSnapshots,
  collectCloudDiagnostics,
  collectPhotoDiagnostics,
  collectAsyncDiagnostics
};
