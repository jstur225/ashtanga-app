const auth = require('./auth');
const localData = require('./local-data');
const localProfile = require('./local-profile');
const accountWorkspace = require('./account-workspace');
const photoStorage = require('./photo-storage');
const guidedAudio = require('./guided-audio');
const runtimeErrors = require('./runtime-errors');
const debugDiagnostics = require('./debug-diagnostics');

function sortRecordsByDate(records) {
  return [...records].sort((a, b) => (
    String(b.date || '').localeCompare(String(a.date || '')) ||
    String(b.created_at || '').localeCompare(String(a.created_at || ''))
  ));
}

function parseAndValidateImportData(jsonString) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    return { valid: false, error: 'JSON 格式错误' };
  }

  if (!data || typeof data !== 'object') {
    return { valid: false, error: '数据格式无效' };
  }

  if (!data.records && !data.options && !data.profile && !data.annotations) {
    return { valid: false, error: '缺少必要字段（records / options / profile / annotations）' };
  }

  if (data.records !== undefined && !Array.isArray(data.records)) {
    return { valid: false, error: 'records 字段格式错误' };
  }
  if (data.options !== undefined && !Array.isArray(data.options)) {
    return { valid: false, error: 'options 字段格式错误' };
  }
  if (data.profile !== undefined && (!data.profile || typeof data.profile !== 'object' || Array.isArray(data.profile))) {
    return { valid: false, error: 'profile 字段格式错误' };
  }
  if (data.annotations !== undefined) {
    const annotations = data.annotations;
    if (!annotations || typeof annotations !== 'object' || Array.isArray(annotations)) {
      return { valid: false, error: 'annotations 字段格式错误' };
    }
    if (annotations.types !== undefined && !Array.isArray(annotations.types)) {
      return { valid: false, error: 'annotations.types 字段格式错误' };
    }
    if (annotations.assignments !== undefined && !Array.isArray(annotations.assignments)) {
      return { valid: false, error: 'annotations.assignments 字段格式错误' };
    }
  }

  return { valid: true, data };
}

function migrateOldOptions(options = []) {
  return options.map((option) => {
    const source = option || {};
    const { label_zh: labelZh, isCustom, ...rest } = source;
    return {
      ...rest,
      label: labelZh || source.label || '',
      is_custom: isCustom !== undefined
        ? isCustom
        : source.is_custom !== undefined
          ? source.is_custom
          : true,
      notes: source.notes || ''
    };
  });
}

function cleanProfileForExport(profile) {
  if (!profile) return undefined;
  const { avatar, ...rest } = profile;
  return rest;
}

function getExportableRecords(records) {
  return (records || []).filter((record) => (
    record &&
    record.type !== '草稿' &&
    !record.is_tutorial &&
    !record.deleted_at
  ));
}

function serializeExportData(records, options, profile, annotations) {
  return JSON.stringify({
    records: getExportableRecords(records),
    options: Array.isArray(options) ? options : [],
    profile: cleanProfileForExport(profile),
    annotations: annotations || { types: [], assignments: [] },
    export_at: new Date().toISOString()
  }, null, 2);
}

function exportLocalData(source = {}) {
  return serializeExportData(
    source.records !== undefined ? source.records : localData.getAllRecords(),
    source.options !== undefined ? source.options : localData.getOptions(),
    source.profile !== undefined ? source.profile : localProfile.getProfile(),
    source.annotations !== undefined ? source.annotations : localData.getAllAnnotations()
  );
}

function importLocalData(jsonString) {
  const result = parseAndValidateImportData(jsonString);
  if (!result.valid || !result.data) return result;

  const { data } = result;
  if (data.records !== undefined) {
    localData.replaceRecords(sortRecordsByDate(data.records));
  }
  if (data.options !== undefined) {
    localData.replaceOptions(migrateOldOptions(data.options));
  }
  if (data.profile !== undefined) {
    localProfile.saveProfile(data.profile);
  }
  if (data.annotations !== undefined) {
    localData.replaceAnnotations(data.annotations);
  }

  return {
    valid: true,
    data,
    counts: {
      records: Array.isArray(data.records) ? data.records.length : 0,
      completed_records: Array.isArray(data.records)
        ? data.records.filter((record) => Number(record && record.duration) > 0).length
        : 0,
      options: Array.isArray(data.options) ? data.options.length : 0,
      annotation_types: data.annotations && Array.isArray(data.annotations.types) ? data.annotations.types.length : 0,
      annotation_assignments: data.annotations && Array.isArray(data.annotations.assignments) ? data.annotations.assignments.length : 0
    }
  };
}

function clearLocalData() {
  localData.getAllRecords().flatMap((record) => (
    Array.isArray(record.photos) ? record.photos : []
  )).filter((path) => !photoStorage.isRemotePhoto(path)).forEach((path) => {
    photoStorage.removeLocalPhoto(path).catch(() => {});
  });
  localData.clearLocalData();
  localProfile.resetProfile();
}

function safeWxInfo(method, fallback = {}) {
  try {
    return typeof wx[method] === 'function' ? wx[method]() || fallback : fallback;
  } catch (error) {
    return { ...fallback, error: error && error.message ? error.message : String(error) };
  }
}

function maskEmailForDebug(value) {
  const [name, domain] = String(value || '').split('@');
  if (!name || !domain) return '';
  return `${name.slice(0, Math.min(2, name.length))}***@${domain}`;
}

function buildDebugLog(pageState = {}) {
  const legacySystemInfo = (!wx.getDeviceInfo || !wx.getAppBaseInfo)
    ? safeWxInfo('getSystemInfoSync')
    : {};
  const deviceInfo = { ...legacySystemInfo, ...safeWxInfo('getDeviceInfo') };
  const appBaseInfo = { ...legacySystemInfo, ...safeWxInfo('getAppBaseInfo') };
  const windowInfo = safeWxInfo('getWindowInfo');
  const systemSetting = safeWxInfo('getSystemSetting');
  const authorizeSetting = safeWxInfo('getAppAuthorizeSetting');
  const accountInfo = safeWxInfo('getAccountInfoSync');
  const storageInfo = safeWxInfo('getStorageInfoSync');

  const session = auth.getStoredSession();
  const isAccountMode = pageState.dataMode === 'cloud' && session && session.user;
  const workspace = isAccountMode ? accountWorkspace.getWorkspace(session.user.id) : null;
  const annotations = workspace ? workspace.annotations : localData.getAllAnnotations();
  const records = workspace ? workspace.records : localData.getAllRecords();
  const options = workspace ? workspace.options : localData.getOptions();
  const pending = workspace ? workspace.pending_operations : [];
  const pendingByEntity = pending.reduce((counts, operation) => {
    const key = operation.entity || 'record';
    counts[key] = Number(counts[key] || 0) + 1;
    return counts;
  }, {});
  const allPhotos = records.flatMap((record) => (Array.isArray(record.photos) ? record.photos : []));
  const diagnosticSummary = runtimeErrors.getEventSummary();
  const storageRatio = Number(storageInfo.limitSize) > 0
    ? Number(storageInfo.currentSize || 0) / Number(storageInfo.limitSize)
    : 0;
  const diagnosticFlags = [
    ...(diagnosticSummary.network && diagnosticSummary.network.is_connected === false ? ['network_disconnected'] : []),
    ...(diagnosticSummary.network_failure_count > 0 ? ['network_failures_detected'] : []),
    ...(diagnosticSummary.slow_request_count > 0 ? ['slow_requests_detected'] : []),
    ...(pending.length > 0 ? ['pending_sync_operations'] : []),
    ...(allPhotos.some((path) => !photoStorage.isRemotePhoto(path)) ? ['local_photos_not_uploaded'] : []),
    ...(storageRatio >= 0.8 ? ['storage_near_limit'] : [])
  ];
  const fullSnapshot = debugDiagnostics.collectSnapshot(pageState);
  return JSON.stringify({
    _meta: {
      version: '3.0-weapp',
      exportTime: new Date().toISOString(),
      description: '熬汤日记小程序调试日志 - 用于问题排查',
      platform: 'wechat-miniprogram'
    },
    log_schema_version: 3,
    generated_at: new Date().toISOString(),
    mode: pageState.dataMode || 'local',
    is_logged_in: Boolean(session && session.user),
    user_email_masked: session && session.user ? maskEmailForDebug(session.user.email) : '',
    mini_program: {
      app_id: accountInfo.miniProgram && accountInfo.miniProgram.appId,
      env_version: accountInfo.miniProgram && accountInfo.miniProgram.envVersion,
      version: accountInfo.miniProgram && accountInfo.miniProgram.version
    },
    counts: {
      records_total: records.length,
      records_active: records.filter((record) => !record.deleted_at && record.type !== '草稿').length,
      options: options.filter((option) => !option.deleted_at).length,
      annotation_types: annotations.types.length,
      annotation_assignments: annotations.assignments.length,
      photos_total: allPhotos.length,
      photos_remote: allPhotos.filter(photoStorage.isRemotePhoto).length,
      photos_local: allPhotos.filter((path) => !photoStorage.isRemotePhoto(path)).length,
      photos_pending_upload: pending.filter((operation) => operation.entity === 'photo' && operation.action === 'upload').length,
      photos_pending_delete: pending.filter((operation) => operation.entity === 'photo' && operation.action === 'delete').length,
      pending_total: pending.length,
      pending_by_entity: pendingByEntity
    },
    sync: workspace ? {
      last_sync_at: workspace.last_sync_at,
      last_sync_status: workspace.last_sync_status,
      cached_record_ranges: workspace.cached_ranges,
      cached_annotation_months: workspace.cached_annotation_months,
      operations: pending.map((operation) => ({
        id: operation.id,
        entity: operation.entity || 'record',
        action: operation.action,
        entity_id: operation.entity_id || operation.record_id,
        attempts: operation.attempts || 0,
        last_error: operation.last_error || '',
        created_at: operation.created_at
      })),
      recent_logs: workspace.sync_logs.slice(0, 50)
    } : null,
    guided_audio: runtimeErrors.sanitizeDetails(guidedAudio.getDiagnostics()),
    page_state: runtimeErrors.sanitizeDetails(pageState),
    system: {
      platform: deviceInfo.platform,
      model: deviceInfo.model,
      brand: deviceInfo.brand,
      system: deviceInfo.system,
      version: appBaseInfo.version,
      SDKVersion: appBaseInfo.SDKVersion,
      language: appBaseInfo.language,
      theme: appBaseInfo.theme,
      benchmark_level: deviceInfo.benchmarkLevel,
      screen: {
        pixel_ratio: windowInfo.pixelRatio,
        screen_width: windowInfo.screenWidth,
        screen_height: windowInfo.screenHeight,
        window_width: windowInfo.windowWidth,
        window_height: windowInfo.windowHeight,
        safe_area: windowInfo.safeArea
      },
      settings: systemSetting,
      authorization: authorizeSetting
    },
    storage: {
      current_size_kb: storageInfo.currentSize,
      limit_size_kb: storageInfo.limitSize,
      usage_ratio: Number(storageRatio.toFixed(4)),
      key_count: Array.isArray(storageInfo.keys) ? storageInfo.keys.length : 0
    },
    diagnostic_flags: diagnosticFlags,
    diagnostic_summary: diagnosticSummary,
    recent_events: runtimeErrors.getRecentEvents(200),
    recent_errors: [
      ...runtimeErrors.getRecentErrors(20),
      ...(workspace ? workspace.sync_logs.filter((log) => log.status === 'error') : [])
    ].slice(0, 20),
    ...fullSnapshot
  }, null, 2);
}

async function collectDebugLog(pageState = {}) {
  const baseLog = JSON.parse(buildDebugLog(pageState));
  const fullDiagnostics = await debugDiagnostics.collectAsyncDiagnostics({
    auth_diagnostics: baseLog.auth_diagnostics,
    records_snapshot: baseLog.records_snapshot,
    guest_records_snapshot: baseLog.guest_records_snapshot,
    options_snapshot: baseLog.options_snapshot,
    profile_snapshot: baseLog.profile_snapshot,
    annotations_snapshot: baseLog.annotations_snapshot,
    sync_diagnostics: baseLog.sync_diagnostics,
    membership_diagnostics: baseLog.membership_diagnostics,
    storage_diagnostics: baseLog.storage_diagnostics,
    runtime_sections: baseLog.runtime_sections
  }, pageState);
  return JSON.stringify({
    ...baseLog,
    ...fullDiagnostics,
    _meta: {
      ...baseLog._meta,
      version: '3.0-weapp',
      diagnostics: 'full'
    },
    generated_at: new Date().toISOString()
  }, null, 2);
}

module.exports = {
  parseAndValidateImportData,
  migrateOldOptions,
  serializeExportData,
  exportLocalData,
  importLocalData,
  clearLocalData,
  buildDebugLog,
  collectDebugLog,
  safeWxInfo,
  maskEmailForDebug
};
