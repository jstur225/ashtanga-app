const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const storage = new Map();
const listeners = {};

global.getCurrentPages = () => [{ route: 'pages/journal/journal' }];
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
  onError(callback) {
    listeners.error = callback;
  },
  onUnhandledRejection(callback) {
    listeners.rejection = callback;
  },
  onMemoryWarning(callback) {
    listeners.memory = callback;
  },
  getNetworkType({ success }) {
    success({ networkType: 'wifi' });
  },
  onNetworkStatusChange(callback) {
    listeners.network = callback;
  }
};

const runtimeErrors = require('../services/runtime-errors');

test.beforeEach(() => {
  storage.clear();
  runtimeErrors.clearRuntimeEvents();
});

test('全局异常会落入有限长度的本地日志，并脱敏账号和凭据', () => {
  runtimeErrors.recordRuntimeError(
    'runtime_error',
    new Error('user@example.com Bearer abc.def.ghi sb_secret_very-secret')
  );
  const errors = runtimeErrors.getRecentErrors();
  assert.equal(errors.length, 1);
  assert.equal(errors[0].route, 'pages/journal/journal');
  assert.match(errors[0].message, /\[email\]/);
  assert.match(errors[0].message, /Bearer \[redacted\]/);
  assert.doesNotMatch(errors[0].message, /user@example\.com|very-secret/);

  for (let index = 0; index < runtimeErrors.MAX_ERRORS + 5; index += 1) {
    runtimeErrors.recordRuntimeError('runtime_error', `error-${index}`);
  }
  assert.equal(runtimeErrors.getRecentErrors(100).length, runtimeErrors.MAX_ERRORS);
});

test('小程序启动会安装运行错误、未处理 Promise 和内存告警监听', () => {
  runtimeErrors.installGlobalErrorHandlers();
  assert.equal(typeof listeners.error, 'function');
  assert.equal(typeof listeners.rejection, 'function');
  assert.equal(typeof listeners.memory, 'function');

  listeners.rejection({ reason: new Error('promise failed') });
  listeners.memory({ level: 10 });
  const errors = runtimeErrors.getRecentErrors();
  assert.equal(errors[0].type, 'memory_warning');
  assert.equal(errors[0].level, 10);
  assert.equal(errors[1].type, 'unhandled_rejection');
});

test('app 启动和运行日志都接入统一错误服务', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  const capsuleSource = fs.readFileSync(path.join(__dirname, '../services/data-capsule.js'), 'utf8');
  assert.match(appSource, /runtimeErrors\.installGlobalErrorHandlers\(\)/);
  assert.match(capsuleSource, /runtimeErrors\.getRecentErrors\(20\)/);
});

test('网络超时日志会记录去掉查询参数的请求地址，便于真机定位具体接口', () => {
  const requestSource = fs.readFileSync(path.resolve(__dirname, '../utils/request.js'), 'utf8');
  assert.match(requestSource, /runtimeErrors\.recordRuntimeError\([\s\S]*'request_error'/);
  assert.match(requestSource, /split\('\?'\)\[0\]/);
  assert.doesNotMatch(requestSource, /header[^\n]*recordRuntimeError/);
});

test('统一事件时间线记录分类、耗时、网络变化并递归脱敏', () => {
  const trace = runtimeErrors.startTrace('sync', 'records', {
    email: 'user@example.com',
    password: 'never-log-this',
    verificationCode: '654321',
    nested: { Authorization: 'Bearer abc.def.ghi' }
  });
  runtimeErrors.finishTrace(trace, 'success', { synced: 2 });
  if (listeners.network) listeners.network({ networkType: '4g', isConnected: true });

  const events = runtimeErrors.getRecentEvents(10);
  assert.match(JSON.stringify(events), /records_start|records_finish/);
  assert.match(JSON.stringify(events), /\[email\]/);
  assert.match(JSON.stringify(events), /\[redacted\]/);
  assert.doesNotMatch(JSON.stringify(events), /never-log-this|654321|abc\.def\.ghi|user@example\.com/);
  assert.equal(runtimeErrors.getEventSummary().network.network_type, '4g');
});

test('事件时间线使用有限环形容量，避免长期占满微信本地存储', () => {
  for (let index = 0; index < runtimeErrors.MAX_EVENTS + 10; index += 1) {
    runtimeErrors.recordEvent('test', 'bounded', { index });
  }
  assert.equal(runtimeErrors.getRecentEvents(999).length, runtimeErrors.MAX_EVENTS);
});
