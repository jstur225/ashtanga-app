const runtimeErrors = require('./runtime-errors');

const DEBUG_LOG_PREFIX = 'ashtanga-debug-log-';
const MAX_RETAINED_FILES = 3;

function getRuntimePlatform() {
  try {
    if (typeof wx.getDeviceInfo === 'function') {
      return String((wx.getDeviceInfo() || {}).platform || '').toLowerCase();
    }
    if (typeof wx.getSystemInfoSync === 'function') {
      return String((wx.getSystemInfoSync() || {}).platform || '').toLowerCase();
    }
  } catch (_) {
    // Platform detection is diagnostic only and must not block the export.
  }
  return '';
}

function formatDateForFileName(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function buildDebugLogFileName(date = new Date(), extension = 'json') {
  const safeExtension = extension === 'txt' ? 'txt' : 'json';
  return `${DEBUG_LOG_PREFIX}${formatDateForFileName(date)}.${safeExtension}`;
}

function normalizeLogContent(content) {
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('运行日志不是有效的 JSON 对象');
  }
  return JSON.stringify(parsed, null, 2);
}

function callFileSystem(method, options) {
  return new Promise((resolve, reject) => {
    const manager = wx.getFileSystemManager();
    manager[method]({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

async function removeOldDebugLogFiles(currentFileName) {
  try {
    const result = await callFileSystem('readdir', { dirPath: wx.env.USER_DATA_PATH });
    const files = (result.files || [])
      .filter((name) => name.startsWith(DEBUG_LOG_PREFIX) && /\.(json|txt)$/.test(name))
      .sort()
      .reverse();
    const retained = new Set(files.slice(0, MAX_RETAINED_FILES));
    retained.add(currentFileName);
    await Promise.all(files
      .filter((name) => !retained.has(name))
      .map((name) => callFileSystem('unlink', {
        filePath: `${wx.env.USER_DATA_PATH}/${name}`
      }).catch(() => null)));
  } catch (error) {
    runtimeErrors.recordRuntimeError('debug_log_cleanup_failed', error, {
      details: { stage: 'cleanup_old_files' }
    });
  }
}

async function writeDebugLogFile(content, date = new Date(), extension = 'json') {
  const normalizedContent = normalizeLogContent(content);
  const fileName = buildDebugLogFileName(date, extension);
  const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
  await callFileSystem('writeFile', {
    filePath,
    data: normalizedContent,
    encoding: 'utf8'
  });
  await removeOldDebugLogFiles(fileName);
  runtimeErrors.recordEvent('diagnostics', 'debug_log_file_written', {
    file_name: fileName,
    byte_length: normalizedContent.length
  });
  return { fileName, filePath, content: normalizedContent };
}

async function prepareDebugLogFiles(content, date = new Date()) {
  const json = await writeDebugLogFile(content, date, 'json');
  const text = await writeDebugLogFile(content, date, 'txt');
  runtimeErrors.recordEvent('diagnostics', 'debug_log_files_prepared', {
    json_file_name: json.fileName,
    text_file_name: text.fileName,
    byte_length: json.content.length
  });
  return { json, txt: text };
}

function shareDebugLogFile(file) {
  if (typeof wx.shareFileMessage !== 'function') {
    return Promise.resolve({ shared: false, reason: 'unsupported' });
  }
  return new Promise((resolve) => {
    wx.shareFileMessage({
      filePath: file.filePath,
      fileName: file.fileName,
      success: () => {
        runtimeErrors.recordEvent('diagnostics', 'debug_log_file_shared', {
          file_name: file.fileName
        });
        resolve({ shared: true });
      },
      fail: (error) => {
        const message = error && error.errMsg ? error.errMsg : String(error || '');
        const cancelled = /cancel/i.test(message);
        runtimeErrors.recordEvent('diagnostics', cancelled
          ? 'debug_log_share_cancelled'
          : 'debug_log_share_failed', {
          file_name: file.fileName,
          message
        });
        resolve({ shared: false, reason: cancelled ? 'cancelled' : 'failed', error });
      }
    });
  });
}

async function exportDebugLog(content, date = new Date()) {
  const platform = getRuntimePlatform();
  const jsonFile = await writeDebugLogFile(content, date, 'json');
  const jsonShareResult = await shareDebugLogFile(jsonFile);
  if (jsonShareResult.shared || jsonShareResult.reason === 'cancelled') {
    return {
      ...jsonFile,
      ...jsonShareResult,
      platform,
      format: 'json',
      attempts: [{ format: 'json', ...jsonShareResult }]
    };
  }

  // Some Android WeChat versions reject uncommon file extensions even though
  // the file content itself is valid. A plain-text file keeps the complete JSON
  // and can still be parsed by the developer after it is received.
  if (jsonShareResult.reason === 'failed' && platform !== 'devtools') {
    const textFile = await writeDebugLogFile(content, date, 'txt');
    const textShareResult = await shareDebugLogFile(textFile);
    return {
      ...textFile,
      ...textShareResult,
      platform,
      format: 'txt',
      attempts: [
        { format: 'json', ...jsonShareResult },
        { format: 'txt', ...textShareResult }
      ]
    };
  }

  return {
    ...jsonFile,
    ...jsonShareResult,
    platform,
    format: 'json',
    attempts: [{ format: 'json', ...jsonShareResult }]
  };
}

module.exports = {
  DEBUG_LOG_PREFIX,
  getRuntimePlatform,
  buildDebugLogFileName,
  normalizeLogContent,
  writeDebugLogFile,
  prepareDebugLogFiles,
  shareDebugLogFile,
  exportDebugLog
};
