const test = require('node:test');
const assert = require('node:assert/strict');

const storage = new Map();
const requests = [];
let removedPath = '';
let fileSize = 1024;

global.wx = {
  env: { USER_DATA_PATH: 'wxfile://usr' },
  getStorageSync(key) { return storage.get(key); },
  setStorageSync(key, value) { storage.set(key, value); },
  removeStorageSync(key) { storage.delete(key); },
  getFileInfo({ success }) { success({ size: fileSize }); },
  getFileSystemManager() {
    return {
      saveFile({ tempFilePath, success }) {
        success({ savedFilePath: `wxfile://usr/${tempFilePath.split('/').pop()}` });
      },
      readFile({ success }) { success({ data: new ArrayBuffer(8) }); },
      unlink({ filePath, success }) { removedPath = filePath; success({}); }
    };
  },
  request(options) {
    requests.push(options);
    if (options.url.includes('/api/oss-signature')) {
      options.success({
        statusCode: 200,
        data: { success: true, data: {
          presignedUrl: 'https://oss.example/upload?signature=1',
          ossKey: 'user/record.jpg',
          ossUrl: 'https://oss.example/user/record.jpg',
          mimeType: 'image/jpeg'
        } }
      });
      return;
    }
    if (options.method === 'HEAD') {
      options.success({ statusCode: 200, header: { 'Content-Length': String(fileSize) } });
      return;
    }
    if (options.method === 'PUT') {
      options.success({ statusCode: 200, data: '' });
      return;
    }
    if (options.url.includes('/api/photos')) {
      options.success({
        statusCode: 200,
        data: { success: true, data: { oss_url: 'https://oss.example/user/record.jpg' } }
      });
    }
  }
};

const auth = require('../services/auth');
const photos = require('../services/photo-storage');

test.beforeEach(() => {
  storage.clear();
  requests.length = 0;
  removedPath = '';
  fileSize = 1024;
  storage.set(auth.SESSION_KEY, {
    access_token: 'token', refresh_token: 'refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'user-photo', email: 'photo@example.com' }
  });
});

test('选择的微信临时照片会保存到小程序永久目录', async () => {
  const saved = await photos.persistPhotos(['wxfile://tmp/camera.jpg']);
  assert.deepEqual(saved, ['wxfile://usr/camera.jpg']);
  assert.equal(await photos.persistPhoto(saved[0]), saved[0]);
});

test('开发者工具的 http://tmp 路径仍按本地临时文件处理', () => {
  assert.equal(photos.isRemotePhoto('http://tmp/camera.jpg'), false);
  assert.equal(photos.isRemotePhoto('http://usr/camera.jpg'), false);
  assert.equal(photos.isRemotePhoto('http://store/camera.jpg'), false);
  assert.equal(photos.isLocalPhoto('http://store/camera.jpg'), true);
  assert.equal(photos.isManagedLocalPhoto('http://store/camera.jpg'), true);
  assert.equal(photos.isCloudPhoto('http://store/camera.jpg'), false);
  assert.equal(photos.isRemotePhoto('https://cdn.example/camera.jpg'), true);
  assert.equal(photos.isCloudPhoto('https://cdn.example/camera.jpg'), true);
  assert.equal(photos.isCloudPhoto('http://cdn.example/camera.jpg'), false);
});

test('开发者工具已持久化的 http://store 照片不会再次保存或误判为公网图片', async () => {
  const path = 'http://store/camera.jpg';
  assert.equal(await photos.persistPhoto(path), path);
});

test('单张照片按 FREE 5MB / PRO 30MB 校验', async () => {
  fileSize = 6 * 1024 * 1024;
  await assert.rejects(
    photos.persistPhotos(['wxfile://tmp/large.jpg']),
    /单张照片不能超过 5 MB/
  );
  assert.deepEqual(
    await photos.persistPhotos(['wxfile://tmp/large.jpg'], { isPro: true }),
    ['wxfile://usr/large.jpg']
  );

  fileSize = 31 * 1024 * 1024;
  await assert.rejects(
    photos.persistPhotos(['wxfile://tmp/too-large.jpg'], { isPro: true }),
    /单张照片不能超过 30 MB/
  );
});

test('账号照片按签名、OSS PUT、客户端 HEAD 校验、元数据四个步骤上传', async () => {
  const url = await photos.uploadPhoto('record-1', 'wxfile://usr/camera.jpg');
  assert.equal(url, 'https://oss.example/user/record.jpg');
  assert.equal(requests.length, 4);
  assert.match(requests[0].url, /api\/oss-signature/);
  assert.equal(requests[1].method, 'PUT');
  assert.ok(requests[1].data instanceof ArrayBuffer);
  assert.equal(requests[2].method, 'HEAD');
  assert.match(requests[2].url, /oss\.example\/user\/record\.jpg/);
  assert.match(requests[3].url, /api\/photos$/);
  assert.equal(requests[3].data.practice_record_id, 'record-1');
});

test('头像按签名和 OSS PUT 上传，不创建练习照片元数据', async () => {
  const url = await photos.uploadAvatar('wxfile://usr/avatar.jpg');
  assert.equal(url, 'https://oss.example/user/record.jpg');
  assert.equal(requests.length, 2);
  assert.match(requests[0].url, /api\/oss-signature/);
  assert.match(requests[0].data.fileName, /^avatar-\d+\.jpg$/);
  assert.equal(requests[1].method, 'PUT');
  assert.equal(requests.some((request) => /api\/photos$/.test(request.url)), false);
});

test('上传完成后可以安全删除小程序永久目录中的副本', async () => {
  assert.equal(await photos.removeLocalPhoto('wxfile://usr/camera.jpg'), true);
  assert.equal(removedPath, 'wxfile://usr/camera.jpg');
  assert.equal(await photos.removeLocalPhoto('https://oss.example/photo.jpg'), false);
});
