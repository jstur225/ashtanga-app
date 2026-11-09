const assert = require('node:assert/strict');
const test = require('node:test');

const storage = new Map();
const files = new Map();
let sharedPayload = null;

global.wx = {
  env: { USER_DATA_PATH: '/user-data' },
  getStorageSync(key) {
    return storage.get(key);
  },
  setStorageSync(key, value) {
    storage.set(key, value);
  },
  getFileSystemManager() {
    return {
      writeFile(options) {
        files.set(options.filePath, options.data);
        options.success({});
      },
      readdir(options) {
        options.success({
          files: Array.from(files.keys()).map((path) => path.split('/').pop())
        });
      },
      unlink(options) {
        files.delete(options.filePath);
        options.success({});
      }
    };
  },
  shareFileMessage(options) {
    sharedPayload = options;
    options.success({});
  }
};

global.getCurrentPages = () => [];

const debugLogExport = require('../services/debug-log-export');

test('运行日志按网页版文件名生成并通过微信分享 JSON 文件', async () => {
  const date = new Date('2026-08-12T15:00:00.000Z');
  const result = await debugLogExport.exportDebugLog({ hello: '熬汤日记' }, date);

  assert.equal(result.fileName, 'ashtanga-debug-log-2026-08-12.json');
  assert.equal(result.filePath, '/user-data/ashtanga-debug-log-2026-08-12.json');
  assert.equal(result.shared, true);
  assert.equal(sharedPayload.fileName, result.fileName);
  assert.equal(sharedPayload.filePath, result.filePath);
  assert.deepEqual(JSON.parse(files.get(result.filePath)), { hello: '熬汤日记' });
});

test('日志内容必须是 JSON 对象，文件分享不可用时返回降级原因', async () => {
  assert.throws(() => debugLogExport.normalizeLogContent('not-json'));
  const originalShare = wx.shareFileMessage;
  delete wx.shareFileMessage;
  const result = await debugLogExport.shareDebugLogFile({
    fileName: 'debug.json',
    filePath: '/user-data/debug.json'
  });
  assert.deepEqual(result, { shared: false, reason: 'unsupported' });
  wx.shareFileMessage = originalShare;
});

test('开发者工具不支持文件分享时不再生成无效的长文本兜底', async () => {
  const originalShare = wx.shareFileMessage;
  const originalDeviceInfo = wx.getDeviceInfo;
  wx.getDeviceInfo = () => ({ platform: 'devtools' });
  delete wx.shareFileMessage;

  const result = await debugLogExport.exportDebugLog({ records: [{ id: 'local-1' }] });

  assert.equal(result.shared, false);
  assert.equal(result.reason, 'unsupported');
  assert.equal(result.platform, 'devtools');
  assert.equal(result.format, 'json');
  assert.equal(result.attempts.length, 1);

  wx.shareFileMessage = originalShare;
  if (originalDeviceInfo) wx.getDeviceInfo = originalDeviceInfo;
  else delete wx.getDeviceInfo;
});

test('日志弹窗打开阶段提前写好 JSON 和 TXT，分享点击无需再等待文件写入', async () => {
  const prepared = await debugLogExport.prepareDebugLogFiles({ ready: true }, new Date('2026-08-12T15:00:00.000Z'));

  assert.match(prepared.json.fileName, /\.json$/);
  assert.match(prepared.txt.fileName, /\.txt$/);
  assert.deepEqual(JSON.parse(files.get(prepared.json.filePath)), { ready: true });
  assert.deepEqual(JSON.parse(files.get(prepared.txt.filePath)), { ready: true });
});

test('安卓真机拒绝 JSON 扩展名时自动改用 TXT 文件分享完整日志', async () => {
  const originalShare = wx.shareFileMessage;
  const originalDeviceInfo = wx.getDeviceInfo;
  const attempts = [];
  wx.getDeviceInfo = () => ({ platform: 'android' });
  wx.shareFileMessage = (options) => {
    attempts.push(options.fileName);
    if (options.fileName.endsWith('.json')) {
      options.fail({ errMsg: 'shareFileMessage:fail unsupported file type' });
      return;
    }
    options.success({});
  };

  const result = await debugLogExport.exportDebugLog({ records: [{ id: 'cloud-1' }] });

  assert.equal(result.shared, true);
  assert.equal(result.platform, 'android');
  assert.equal(result.format, 'txt');
  assert.equal(result.attempts.length, 2);
  assert.match(result.fileName, /\.txt$/);
  assert.match(attempts[0], /\.json$/);
  assert.match(attempts[1], /\.txt$/);
  assert.deepEqual(JSON.parse(files.get(result.filePath)), { records: [{ id: 'cloud-1' }] });

  wx.shareFileMessage = originalShare;
  if (originalDeviceInfo) wx.getDeviceInfo = originalDeviceInfo;
  else delete wx.getDeviceInfo;
});
