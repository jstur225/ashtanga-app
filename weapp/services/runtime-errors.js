const STORAGE_KEY = 'ashtanga_runtime_errors_v1';
const EVENT_STORAGE_KEY = 'ashtanga_runtime_events_v2';
const MAX_ERRORS = 30;
const MAX_EVENTS = 240;
const MAX_MESSAGE_LENGTH = 800;
const MAX_STACK_LENGTH = 2000;
const MAX_DETAIL_LENGTH = 500;

let installed = false;
let eventCache = null;
let eventSequence = 0;
let persistTimer = null;
let sessionStartedAt = Date.now();
let sessionId = `session-${sessionStartedAt}-${Math.random().toString(36).slice(2, 8)}`;
let networkState = { network_type: 'unknown', is_connected: null, updated_at: '' };

function redactText(value, maxLength) {
  return String(value || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[jwt]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g, 'sb_[redacted]')
    .replace(/([?&](?:token|access_token|refresh_token|code|key|signature|paySig|signData)=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, maxLength || MAX_MESSAGE_LENGTH);
}

function sanitizeDetails(value, depth = 0, key = '') {
  if (depth > 4) return '[max-depth]';
  if (/password|verification.?code|reset.?code|otp|token|authorization|cookie|secret|signature|paysig|signdata|session_key|appkey/i.test(key)) {
    return '[redacted]';
  }
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return redactText(value, MAX_DETAIL_LENGTH);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeDetails(item, depth + 1, key));
  if (typeof value === 'object') {
    return Object.keys(value).slice(0, 30).reduce((result, childKey) => {
      result[childKey] = sanitizeDetails(value[childKey], depth + 1, childKey);
      return result;
    }, {});
  }
  return redactText(value, MAX_DETAIL_LENGTH);
}

function getCurrentRoute() {
  try {
    if (typeof getCurrentPages !== 'function') return '';
    const pages = getCurrentPages();
    const page = pages && pages[pages.length - 1];
    return page && page.route ? String(page.route) : '';
  } catch (error) {
    return '';
  }
}

function readErrors() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

function writeErrors(errors) {
  try {
    wx.setStorageSync(STORAGE_KEY, errors.slice(0, MAX_ERRORS));
  } catch (error) {
    // 日志写入不能影响主流程。
  }
}

function readEvents() {
  if (eventCache) return eventCache;
  try {
    const stored = wx.getStorageSync(EVENT_STORAGE_KEY);
    eventCache = Array.isArray(stored) ? stored : [];
  } catch (error) {
    eventCache = [];
  }
  return eventCache;
}

function flushEvents() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    wx.setStorageSync(EVENT_STORAGE_KEY, readEvents().slice(0, MAX_EVENTS));
  } catch (error) {
    // 诊断写入不能影响主流程。
  }
}

function scheduleEventFlush(immediate = false) {
  if (immediate) {
    flushEvents();
    return;
  }
  if (persistTimer) return;
  persistTimer = setTimeout(flushEvents, 350);
}

function recordEvent(category, name, details = {}, options = {}) {
  const now = Date.now();
  const entry = {
    occurred_at: new Date(now).toISOString(),
    elapsed_ms: Math.max(0, now - sessionStartedAt),
    session_id: sessionId,
    sequence: ++eventSequence,
    category: String(category || 'runtime'),
    name: String(name || 'event'),
    level: String(options.level || 'info'),
    route: getCurrentRoute(),
    details: sanitizeDetails(details)
  };
  const events = readEvents();
  events.unshift(entry);
  eventCache = events.slice(0, MAX_EVENTS);
  scheduleEventFlush(Boolean(options.immediate));
  return entry;
}

function startTrace(category, name, details = {}) {
  const trace = {
    id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: String(category || 'runtime'),
    name: String(name || 'operation'),
    started_at: Date.now()
  };
  recordEvent(trace.category, `${trace.name}_start`, { trace_id: trace.id, ...details });
  return trace;
}

function finishTrace(trace, status = 'success', details = {}) {
  if (!trace) return null;
  return recordEvent(trace.category, `${trace.name}_finish`, {
    trace_id: trace.id,
    status,
    duration_ms: Math.max(0, Date.now() - Number(trace.started_at || Date.now())),
    ...details
  }, { level: status === 'error' ? 'error' : status === 'warning' ? 'warning' : 'info', immediate: status === 'error' });
}

function startSession(launchOptions = {}) {
  sessionStartedAt = Date.now();
  sessionId = `session-${sessionStartedAt}-${Math.random().toString(36).slice(2, 8)}`;
  eventSequence = 0;
  return recordEvent('lifecycle', 'app_launch', {
    scene: launchOptions.scene,
    path: launchOptions.path,
    query_keys: launchOptions.query ? Object.keys(launchOptions.query).slice(0, 20) : [],
    referrer_app_id: launchOptions.referrerInfo && launchOptions.referrerInfo.appId
  }, { immediate: true });
}

function getRecentEvents(limit = 80) {
  return readEvents().slice(0, Math.max(0, Math.min(MAX_EVENTS, Number(limit) || 0)));
}

function clearRuntimeEvents() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  eventCache = [];
  try {
    wx.removeStorageSync(EVENT_STORAGE_KEY);
  } catch (error) {
    // 清理失败不影响主流程。
  }
}

function getEventSummary() {
  const events = getRecentEvents(MAX_EVENTS);
  const currentEvents = events.filter((event) => event.session_id === sessionId);
  const networkEvents = currentEvents.filter((event) => event.category === 'network');
  const durations = networkEvents.map((event) => Number(event.details && event.details.duration_ms) || 0);
  return {
    session_id: sessionId,
    session_started_at: new Date(sessionStartedAt).toISOString(),
    session_elapsed_ms: Math.max(0, Date.now() - sessionStartedAt),
    event_count: currentEvents.length,
    retained_event_count: events.length,
    error_count: currentEvents.filter((event) => event.level === 'error').length,
    warning_count: currentEvents.filter((event) => event.level === 'warning').length,
    network_request_count: networkEvents.length,
    network_failure_count: networkEvents.filter((event) => event.name === 'request_failed' || event.name === 'request_http_error').length,
    slow_request_count: durations.filter((duration) => duration >= 3000).length,
    max_request_ms: durations.length ? Math.max(...durations) : 0,
    network: networkState
  };
}

function normalizeError(error) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack || '' };
  }
  if (error && typeof error === 'object') {
    const message = error.message || error.errMsg || error.reason;
    let fallbackMessage = '[unserializable error]';
    if (!message) {
      try {
        fallbackMessage = JSON.stringify(error);
      } catch (serializationError) {
        // 循环引用等异常仍需留下一个可识别的占位。
      }
    }
    return {
      message: message || fallbackMessage,
      stack: error.stack || ''
    };
  }
  return { message: error, stack: '' };
}

function recordRuntimeError(type, error, extra = {}) {
  const normalized = normalizeError(error);
  const entry = {
    occurred_at: new Date().toISOString(),
    type: String(type || 'runtime_error'),
    route: getCurrentRoute(),
    message: redactText(normalized.message, MAX_MESSAGE_LENGTH),
    stack: redactText(normalized.stack, MAX_STACK_LENGTH),
    level: extra && extra.level !== undefined ? extra.level : undefined
  };
  const errors = readErrors();
  errors.unshift(entry);
  writeErrors(errors);
  recordEvent('error', entry.type, {
    message: entry.message,
    stack: entry.stack,
    ...(extra && extra.details ? extra.details : {})
  }, { level: 'error', immediate: true });
  return entry;
}

function getRecentErrors(limit = 20) {
  return readErrors().slice(0, Math.max(0, Number(limit) || 0));
}

function clearRuntimeErrors() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (error) {
    // 清理失败不影响主流程。
  }
}

function installGlobalErrorHandlers() {
  if (installed || typeof wx === 'undefined') return;
  installed = true;
  if (typeof wx.onError === 'function') {
    wx.onError((error) => recordRuntimeError('runtime_error', error));
  }
  if (typeof wx.onUnhandledRejection === 'function') {
    wx.onUnhandledRejection((event) => {
      recordRuntimeError('unhandled_rejection', event && event.reason !== undefined ? event.reason : event);
    });
  }
  if (typeof wx.onMemoryWarning === 'function') {
    wx.onMemoryWarning((event) => recordRuntimeError('memory_warning', 'memory warning', event));
  }
  if (typeof wx.getNetworkType === 'function') {
    wx.getNetworkType({
      success(result) {
        networkState = {
          network_type: result.networkType || 'unknown',
          is_connected: result.networkType !== 'none',
          updated_at: new Date().toISOString()
        };
        recordEvent('network', 'network_initial', networkState);
      },
      fail(error) {
        recordRuntimeError('network_state_error', error);
      }
    });
  }
  if (typeof wx.onNetworkStatusChange === 'function') {
    wx.onNetworkStatusChange((result) => {
      networkState = {
        network_type: result.networkType || 'unknown',
        is_connected: Boolean(result.isConnected),
        updated_at: new Date().toISOString()
      };
      recordEvent('network', 'network_changed', networkState, {
        level: result.isConnected ? 'info' : 'warning',
        immediate: !result.isConnected
      });
    });
  }
}

module.exports = {
  STORAGE_KEY,
  EVENT_STORAGE_KEY,
  MAX_ERRORS,
  MAX_EVENTS,
  redactText,
  sanitizeDetails,
  recordEvent,
  startTrace,
  finishTrace,
  startSession,
  getRecentEvents,
  clearRuntimeEvents,
  getEventSummary,
  flushEvents,
  recordRuntimeError,
  getRecentErrors,
  clearRuntimeErrors,
  installGlobalErrorHandlers
};
