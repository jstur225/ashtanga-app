const {
  DEFAULT_GUIDED_AUDIO_VARIANT,
  getGuidedAudioVariant
} = require('./guided-audio-variants');

const LEGACY_CACHE_META_KEY = 'guided_audio_cache_meta';
const CACHE_META_KEY_PREFIX = 'guided_audio_cache_meta:';

const downloadTasks = new Map();
const downloadPromises = new Map();
const backgroundCacheScheduled = new Set();
const cacheStates = new Map();
const listeners = new Set();

function resolveVariant(variantOrId) {
  if (variantOrId && typeof variantOrId === 'object') {
    return getGuidedAudioVariant(variantOrId.id);
  }
  return getGuidedAudioVariant(variantOrId);
}

function getCacheMetaKey(variant) {
  return `${CACHE_META_KEY_PREFIX}${variant.cacheKey}`;
}

function getDefaultState() {
  return {
    status: 'idle',
    progress: 0,
    bytesWritten: 0,
    totalBytes: 0,
    error: ''
  };
}

function getRawState(variant) {
  return cacheStates.get(variant.id) || getDefaultState();
}

function getCachePath(variantOrId) {
  const variant = resolveVariant(variantOrId);
  const root = wx.env && wx.env.USER_DATA_PATH ? wx.env.USER_DATA_PATH : '';
  return root
    ? `${root}/guided-audio/${variant.cacheKey}-${variant.cacheVersion}.m4a`
    : '';
}

function notify(variant, nextState) {
  const state = { ...getRawState(variant), ...nextState };
  cacheStates.set(variant.id, state);
  listeners.forEach((listener) => {
    try {
      listener({ ...state, variantId: variant.id });
    } catch (_error) {
      // 单个监听器异常不应中断下载。
    }
  });
}

function getFileSystem() {
  return wx.getFileSystemManager ? wx.getFileSystemManager() : null;
}

function isFileValid(path, variant) {
  if (!path) return false;
  const fs = getFileSystem();
  if (!fs || typeof fs.statSync !== 'function') return true;
  try {
    const result = fs.statSync(path);
    const stat = result && result.stats ? result.stats : result;
    return Number(stat && stat.size) >= Number(variant.minValidBytes || 1);
  } catch (_error) {
    return false;
  }
}

function readCacheMeta(variant) {
  let meta = wx.getStorageSync(getCacheMetaKey(variant));
  if (!meta && variant.id === DEFAULT_GUIDED_AUDIO_VARIANT.id) {
    meta = wx.getStorageSync(LEGACY_CACHE_META_KEY);
    if (meta && meta.version === 'guided-audio-20260720-v1' && isFileValid(meta.path, variant)) {
      const migrated = {
        version: variant.cacheVersion,
        path: meta.path,
        cachedAt: meta.cachedAt || new Date().toISOString()
      };
      wx.setStorageSync(getCacheMetaKey(variant), migrated);
      wx.removeStorageSync(LEGACY_CACHE_META_KEY);
      return migrated;
    }
  }
  return meta;
}

function getCachedPath(variantOrId) {
  const variant = resolveVariant(variantOrId);
  const meta = readCacheMeta(variant);
  if (!meta || meta.version !== variant.cacheVersion || !isFileValid(meta.path, variant)) return '';
  return meta.path;
}

function ensureCacheDirectory() {
  const fs = getFileSystem();
  const root = wx.env && wx.env.USER_DATA_PATH ? wx.env.USER_DATA_PATH : '';
  if (!fs || !root) return false;
  try {
    fs.mkdirSync(`${root}/guided-audio`, true);
    return true;
  } catch (_error) {
    try {
      fs.accessSync(`${root}/guided-audio`);
      return true;
    } catch (_accessError) {
      return false;
    }
  }
}

function removeCachedFile(variantOrId) {
  const variant = resolveVariant(variantOrId);
  const meta = readCacheMeta(variant);
  const path = meta && meta.path ? meta.path : getCachePath(variant);
  const fs = getFileSystem();
  if (path && fs && typeof fs.unlinkSync === 'function') {
    try {
      fs.unlinkSync(path);
    } catch (_error) {
      // 文件不存在时直接清理元数据。
    }
  }
  wx.removeStorageSync(getCacheMetaKey(variant));
  if (variant.id === DEFAULT_GUIDED_AUDIO_VARIANT.id) {
    wx.removeStorageSync(LEGACY_CACHE_META_KEY);
  }
  notify(variant, getDefaultState());
}

function getNetworkType() {
  return new Promise((resolve) => {
    if (!wx.getNetworkType) {
      resolve('unknown');
      return;
    }
    wx.getNetworkType({
      success: (result) => resolve(result.networkType || 'unknown'),
      fail: () => resolve('unknown')
    });
  });
}

async function downloadForOfflineCache(variantOrId) {
  const variant = resolveVariant(variantOrId);
  const cachedPath = getCachedPath(variant);
  if (cachedPath) {
    notify(variant, { status: 'ready', progress: 100, error: '' });
    return cachedPath;
  }
  if (downloadPromises.has(variant.id)) return downloadPromises.get(variant.id);
  if (!ensureCacheDirectory()) return '';

  const promise = (async () => {
    const networkType = await getNetworkType();
    if (networkType !== 'wifi') {
      notify(variant, { status: 'wifi-required', error: '' });
      return '';
    }

    const filePath = getCachePath(variant);
    notify(variant, { status: 'downloading', progress: 0, bytesWritten: 0, totalBytes: 0, error: '' });
    return new Promise((resolve) => {
      const task = wx.downloadFile({
        url: variant.audioUrl,
        filePath,
        timeout: 10 * 60 * 1000,
        success: (result) => {
          const successful = Number(result.statusCode || 200) >= 200 && Number(result.statusCode || 200) < 300;
          if (!successful || !isFileValid(filePath, variant)) {
            removeCachedFile(variant);
            notify(variant, { status: 'error', error: '口令音频缓存不完整' });
            resolve('');
            return;
          }
          wx.setStorageSync(getCacheMetaKey(variant), {
            version: variant.cacheVersion,
            path: filePath,
            cachedAt: new Date().toISOString()
          });
          notify(variant, { status: 'ready', progress: 100, error: '' });
          resolve(filePath);
        },
        fail: (error) => {
          removeCachedFile(variant);
          notify(variant, {
            status: 'error',
            error: error && error.errMsg ? error.errMsg : '口令音频缓存失败'
          });
          resolve('');
        }
      });
      downloadTasks.set(variant.id, task);

      if (task && typeof task.onProgressUpdate === 'function') {
        task.onProgressUpdate((progress) => {
          notify(variant, {
            status: 'downloading',
            progress: Math.max(0, Math.min(100, Number(progress.progress) || 0)),
            bytesWritten: Number(progress.totalBytesWritten) || 0,
            totalBytes: Number(progress.totalBytesExpectedToWrite) || 0,
            error: ''
          });
        });
      }
    });
  })();
  downloadPromises.set(variant.id, promise);
  try {
    return await promise;
  } finally {
    if (downloadPromises.get(variant.id) === promise) downloadPromises.delete(variant.id);
    downloadTasks.delete(variant.id);
  }
}

function scheduleBackgroundCache(variantOrId, delayMs = 30000) {
  const variant = resolveVariant(variantOrId);
  if (
    backgroundCacheScheduled.has(variant.id)
    || getCachedPath(variant)
    || downloadPromises.has(variant.id)
    || getRawState(variant).status === 'wifi-required'
  ) return;
  backgroundCacheScheduled.add(variant.id);
  setTimeout(() => {
    backgroundCacheScheduled.delete(variant.id);
    void downloadForOfflineCache(variant);
  }, Math.max(0, Number(delayMs) || 0));
}

function subscribe(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getState(variantOrId) {
  const variant = resolveVariant(variantOrId);
  const cachedPath = getCachedPath(variant);
  const state = getRawState(variant);
  return {
    ...state,
    variantId: variant.id,
    status: cachedPath ? 'ready' : state.status,
    progress: cachedPath ? 100 : state.progress,
    cachedPath
  };
}

module.exports = {
  AUDIO_URL: DEFAULT_GUIDED_AUDIO_VARIANT.audioUrl,
  CACHE_VERSION: DEFAULT_GUIDED_AUDIO_VARIANT.cacheVersion,
  downloadForOfflineCache,
  getCachedPath,
  getState,
  removeCachedFile,
  scheduleBackgroundCache,
  subscribe
};
