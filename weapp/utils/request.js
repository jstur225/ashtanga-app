const config = require('../config');
const runtimeErrors = require('../services/runtime-errors');
let requestSequence = 0;

function safeRequestTarget(value) {
  return String(value || '').split('?')[0].slice(0, 300);
}

function getResponseRequestId(headers) {
  const source = headers && typeof headers === 'object' ? headers : {};
  const key = Object.keys(source).find((name) => /^(x-request-id|request-id|x-vercel-id)$/i.test(name));
  return key ? String(source[key] || '').slice(0, 200) : '';
}

function getServerTiming(headers) {
  const source = headers && typeof headers === 'object' ? headers : {};
  const key = Object.keys(source).find((name) => /^server-timing$/i.test(name));
  return key ? String(source[key] || '').slice(0, 300) : '';
}

function request(options) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const requestId = `request-${startedAt}-${++requestSequence}`;
    const method = String(options.method || 'GET').toUpperCase();
    const target = safeRequestTarget(options.url);
    wx.request({
      timeout: 15000,
      ...options,
      success(res) {
        const duration = Date.now() - startedAt;
        const details = {
          request_id: requestId,
          method,
          target,
          status_code: res.statusCode,
          duration_ms: duration,
          response_request_id: getResponseRequestId(res.header),
          server_timing: getServerTiming(res.header)
        };
        if (res.statusCode >= 200 && res.statusCode < 300) {
          runtimeErrors.recordEvent('network', 'request_completed', details, {
            level: duration >= 3000 ? 'warning' : 'info'
          });
          resolve(res.data);
          return;
        }

        const body = res.data || {};
        const error = new Error(
          body.error_description ||
          body.msg ||
          body.message ||
          body.error ||
          `请求失败（${res.statusCode}）`
        );
        error.statusCode = res.statusCode;
        error.body = body;
        runtimeErrors.recordEvent('network', 'request_http_error', {
          ...details,
          message: error.message
        }, { level: 'error', immediate: true });
        reject(error);
      },
      fail(err) {
        const error = new Error(err.errMsg || '网络连接失败，请稍后重试');
        error.cause = err;
        runtimeErrors.recordRuntimeError(
          'request_error',
          `${method} ${target} · ${error.message}`,
          {
            details: {
              request_id: requestId,
              method,
              target,
              duration_ms: Date.now() - startedAt,
              timeout_ms: Number(options.timeout) || 15000,
              errno: err && err.errno
            }
          }
        );
        reject(error);
      }
    });
  });
}

function supabaseRequest(path, options = {}) {
  const headers = {
    apikey: config.supabaseAnonKey,
    'Content-Type': 'application/json',
    ...(options.header || {})
  };

  return request({
    ...options,
    url: `${config.supabaseUrl}${path}`,
    header: headers
  });
}

function appApiRequest(path, options = {}) {
  return request({
    ...options,
    url: `${config.apiBaseUrl}${path}`,
    header: {
      'Content-Type': 'application/json',
      ...(options.header || {})
    }
  });
}

module.exports = {
  request,
  supabaseRequest,
  appApiRequest,
  safeRequestTarget,
  getResponseRequestId
};
