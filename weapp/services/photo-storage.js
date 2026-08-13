const auth = require('./auth');
const { appApiRequest, safeRequestTarget } = require('../utils/request');
const runtimeErrors = require('./runtime-errors');

const FREE_MAX_BYTES = 5 * 1024 * 1024;
const PRO_MAX_BYTES = 30 * 1024 * 1024;

function isLocalPhoto(path) {
  const value = String(path || '');
  const root = wx.env && wx.env.USER_DATA_PATH ? String(wx.env.USER_DATA_PATH) : '';
  if (root && value.startsWith(root)) return true;
  if (/^wxfile:\/\//i.test(value)) return true;
  return /^https?:\/\/(tmp|usr|store)(?:\/|$)/i.test(value);
}

function isRemotePhoto(path) {
  const value = String(path || '');
  return !isLocalPhoto(value) && /^https?:\/\//i.test(value);
}

function isCloudPhoto(path) {
  const value = String(path || '');
  return !isLocalPhoto(value) && /^https:\/\//i.test(value);
}

function isManagedLocalPhoto(path) {
  const value = String(path || '');
  const root = wx.env && wx.env.USER_DATA_PATH ? String(wx.env.USER_DATA_PATH) : '';
  if (root && value.startsWith(root)) return true;
  return /^(?:wxfile:\/\/(?:usr|store)|https?:\/\/(?:usr|store))(?:\/|$)/i.test(value);
}

function getMimeType(path) {
  const cleanPath = String(path || '').split('?')[0].toLowerCase();
  if (cleanPath.endsWith('.png')) return 'image/png';
  if (cleanPath.endsWith('.webp')) return 'image/webp';
  if (cleanPath.endsWith('.gif')) return 'image/gif';
  if (cleanPath.endsWith('.heic') || cleanPath.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function getFileName(path) {
  const cleanPath = String(path || '').split('?')[0];
  return cleanPath.split('/').pop() || `practice-${Date.now()}.jpg`;
}

function fsCall(method, options) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager && wx.getFileSystemManager();
    if (!fs || typeof fs[method] !== 'function') {
      reject(new Error('当前微信版本不支持照片本地存储'));
      return;
    }
    fs[method]({
      ...options,
      success: resolve,
      fail(error) {
        reject(new Error(error && error.errMsg ? error.errMsg : '照片文件操作失败'));
      }
    });
  });
}

async function getFileInfo(path) {
  const fs = wx.getFileSystemManager && wx.getFileSystemManager();
  if (fs && typeof fs.stat === 'function') {
    const stat = await fsCall('stat', { path });
    return { size: Number(stat && stat.stats && stat.stats.size) || 0 };
  }
  if (wx.getFileInfo) {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath: path,
        success: resolve,
        fail(error) {
          reject(new Error(error && error.errMsg ? error.errMsg : '无法读取照片信息'));
        }
      });
    });
  }
  throw new Error('当前微信版本不支持读取照片信息');
}

async function validatePhotoSize(path, options = {}) {
  if (!path || isRemotePhoto(path)) return true;
  const info = await getFileInfo(path);
  const maxBytes = options.isPro ? PRO_MAX_BYTES : FREE_MAX_BYTES;
  if (Number(info.size) > maxBytes) {
    throw new Error(`单张照片不能超过 ${options.isPro ? 30 : 5} MB`);
  }
  return true;
}

async function persistPhoto(path, options = {}) {
  if (!path || isRemotePhoto(path) || isManagedLocalPhoto(path)) return path;
  await validatePhotoSize(path, options);
  const result = await fsCall('saveFile', { tempFilePath: path });
  if (!result || !result.savedFilePath) throw new Error('照片保存到本机失败');
  return result.savedFilePath;
}

async function persistPhotos(paths, options = {}) {
  const unique = [...new Set((Array.isArray(paths) ? paths : []).filter(Boolean))];
  const saved = [];
  for (const path of unique) saved.push(await persistPhoto(path, options));
  return saved;
}

async function removeLocalPhoto(path) {
  if (!isManagedLocalPhoto(path)) return false;
  try {
    await fsCall('unlink', { filePath: path });
    return true;
  } catch (error) {
    return false;
  }
}

async function authenticatedApi(path, options = {}, retried = false) {
  const session = await auth.getValidSession();
  if (!session) throw new Error('请先登录后同步照片');
  try {
    return await appApiRequest(path, {
      ...options,
      header: { ...(options.header || {}), Authorization: `Bearer ${session.access_token}` }
    });
  } catch (error) {
    if (!retried && auth.isRecoverableSessionError(error)) {
      await auth.refreshSession(session.refresh_token);
      return authenticatedApi(path, options, true);
    }
    throw error;
  }
}

function putBinary(url, data, mimeType) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const target = safeRequestTarget(url);
    wx.request({
      url,
      method: 'PUT',
      timeout: 60000,
      data,
      header: { 'Content-Type': mimeType },
      success(response) {
        const duration = Date.now() - startedAt;
        if (response.statusCode >= 200 && response.statusCode < 300) {
          runtimeErrors.recordEvent('photo', 'oss_upload_completed', {
            target,
            status_code: response.statusCode,
            duration_ms: duration,
            bytes: data && data.byteLength !== undefined ? data.byteLength : undefined,
            mime_type: mimeType
          }, { level: duration >= 5000 ? 'warning' : 'info' });
          resolve(response);
        } else {
          const error = new Error(`照片上传失败（${response.statusCode}）`);
          runtimeErrors.recordRuntimeError('photo_oss_http_error', error, {
            details: { target, status_code: response.statusCode, duration_ms: duration }
          });
          reject(error);
        }
      },
      fail(error) {
        const uploadError = new Error(error && error.errMsg ? error.errMsg : '照片上传网络失败');
        runtimeErrors.recordRuntimeError('photo_oss_request_error', uploadError, {
          details: { target, duration_ms: Date.now() - startedAt, errno: error && error.errno }
        });
        reject(uploadError);
      }
    });
  });
}

function headVerifyOssObject(ossUrl, expectedSize) {
  return new Promise((resolve) => {
    if (!ossUrl) { resolve(true); return; }
    wx.request({
      url: ossUrl,
      method: 'HEAD',
      timeout: 10000,
      success(response) {
        const lenText = String((response.header && (
          response.header['Content-Length'] || response.header['content-length']
        )) || '');
        const len = Number(lenText);
        const ok = response.statusCode >= 200 && response.statusCode < 300 &&
          (!lenText || len === Number(expectedSize));
        if (!ok) {
          runtimeErrors.recordEvent('photo', 'oss_head_mismatch', {
            target: safeRequestTarget(ossUrl),
            status_code: response.statusCode,
            expected_size: Number(expectedSize) || 0,
            actual_size: len
          }, { level: 'warning' });
        }
        resolve(ok);
      },
      fail() {
        // HEAD 网络失败不阻塞：字节已 PUT 成功，服务端登记时仍会复核大小。
        resolve(true);
      }
    });
  });
}

async function uploadPhotoToOss(localPath, options = {}) {
  if (!localPath || isRemotePhoto(localPath)) throw new Error('照片上传参数无效');
  const info = await getFileInfo(localPath);
  const maxBytes = options.isPro ? PRO_MAX_BYTES : FREE_MAX_BYTES;
  if (Number(info.size) > maxBytes) {
    throw new Error(`单张照片不能超过 ${options.isPro ? 30 : 5} MB`);
  }
  const mimeType = getMimeType(localPath);
  const signature = await authenticatedApi('/api/oss-signature', {
    method: 'POST',
    data: { fileName: getFileName(localPath), mimeType }
  });
  const signed = signature && signature.data;
  if (!signed || !signed.presignedUrl || !signed.ossUrl || !signed.ossKey) {
    throw new Error('照片上传签名无效');
  }
  const file = await fsCall('readFile', { filePath: localPath });
  await putBinary(signed.presignedUrl, file.data, signed.mimeType || mimeType);
  const verified = await headVerifyOssObject(signed.ossUrl, Number(info.size) || 0);
  if (!verified) throw new Error('照片上传不完整，请重新上传');
  return {
    ossUrl: signed.ossUrl,
    ossKey: signed.ossKey,
    mimeType: signed.mimeType || mimeType,
    fileSize: Number(info.size) || 0
  };
}

async function registerPhotoMetadata(recordId, options = {}) {
  if (!recordId || !options.ossUrl || !options.ossKey) throw new Error('照片登记参数无效');
  const metadata = await authenticatedApi('/api/photos', {
    method: 'POST',
    data: {
      practice_record_id: recordId,
      oss_url: options.ossUrl,
      oss_key: options.ossKey,
      file_size: Number(options.fileSize) || 0,
      mime_type: options.mimeType || 'image/jpeg'
    }
  });
  const photo = metadata && metadata.data;
  return (photo && photo.oss_url) || options.ossUrl;
}

async function uploadPhoto(recordId, localPath, options = {}) {
  const remote = await uploadPhotoToOss(localPath, options);
  await registerPhotoMetadata(recordId, {
    ossUrl: remote.ossUrl,
    ossKey: remote.ossKey,
    mimeType: remote.mimeType,
    fileSize: remote.fileSize
  });
  return remote.ossUrl;
}
async function uploadAvatar(localPath) {
  if (!localPath || isRemotePhoto(localPath)) throw new Error('头像上传参数无效');
  await validatePhotoSize(localPath, { isPro: false });
  const mimeType = getMimeType(localPath);
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const signature = await authenticatedApi('/api/oss-signature', {
    method: 'POST',
    data: { fileName: `avatar-${Date.now()}.${extension}`, mimeType }
  });
  const signed = signature && signature.data;
  if (!signed || !signed.presignedUrl || !signed.ossUrl) {
    throw new Error('头像上传签名无效');
  }
  const file = await fsCall('readFile', { filePath: localPath });
  await putBinary(signed.presignedUrl, file.data, signed.mimeType || mimeType);
  return signed.ossUrl;
}

async function deleteRemotePhoto(recordId, ossUrl) {
  if (!recordId || !isRemotePhoto(ossUrl)) return true;
  try {
    await authenticatedApi('/api/photos/delete-by-record', {
      method: 'POST',
      data: { practice_record_id: recordId, oss_url: ossUrl }
    });
  } catch (error) {
    if (error && error.statusCode === 404) return true;
    throw error;
  }
  return true;
}

module.exports = {
  FREE_MAX_BYTES,
  PRO_MAX_BYTES,
  isLocalPhoto,
  isRemotePhoto,
  isCloudPhoto,
  isManagedLocalPhoto,
  getMimeType,
  validatePhotoSize,
  persistPhoto,
  persistPhotos,
  removeLocalPhoto,
  uploadAvatar,
  uploadPhoto,
  uploadPhotoToOss,
  registerPhotoMetadata,
  deleteRemotePhoto
};
