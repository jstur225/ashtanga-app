const config = require('../config');

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      timeout: 15000,
      ...options,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
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
        reject(error);
      },
      fail(err) {
        const error = new Error(err.errMsg || '网络连接失败，请稍后重试');
        error.cause = err;
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
  appApiRequest
};
