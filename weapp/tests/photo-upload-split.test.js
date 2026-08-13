const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('photo-storage splits OSS upload from metadata registration', () => {
  const ps = read('services/photo-storage.js');

  // 字节上传（签名 + PUT + 客户端 HEAD 校验）
  assert.match(ps, /async function uploadPhotoToOss\(localPath, options = \{\}\)/);
  assert.match(ps, /headVerifyOssObject\(signed\.ossUrl, Number\(info\.size\) \|\| 0\)/);
  assert.match(ps, /method: 'HEAD'/);

  // 元数据登记单独成函数
  assert.match(ps, /async function registerPhotoMetadata\(recordId, options = \{\}\)/);
  assert.match(ps, /'\/api\/photos'/);

  // 旧 uploadPhoto 仍保留（后台同步路径使用），导出新增两个函数
  assert.match(ps, /async function uploadPhoto\(recordId, localPath, options = \{\}\)/);
  assert.match(ps, /uploadPhotoToOss,/);
  assert.match(ps, /registerPhotoMetadata,/);
});

test('form upload path unlocks save after OSS bytes land, metadata queued in background', () => {
  const dr = read('services/data-repository.js');
  const form = read('components/practice-record-form/index.js');

  // 表单即时上传：字节到 OSS 即标记成功（replaceRecordPhoto 提前）
  assert.match(dr, /const remote = await photoStorage\.uploadPhotoToOss\(localPath, \{ isPro \}\)/);
  assert.match(dr, /accountWorkspace\.replaceRecordPhoto\(accountId, recordId, localPath, remotePath\)/);

  // “上传”待办换成“登记”待办，登记不再阻塞保存
  assert.match(dr, /enqueueOperation\(accountId, 'photo', 'register',/);
  assert.match(dr, /照片已上传到云端，元数据登记转入后台/);
  assert.match(dr, /syncPendingRecords\(\{ includePhotos: true \}\)\.catch\(\(\) => null\)/);

  // 后台同步器处理 register 待办
  assert.match(dr, /operation\.entity === 'photo' && operation\.action === 'register'/);
  assert.match(dr, /photoStorage\.registerPhotoMetadata\(operation\.payload\.record_id, \{/);

  // 保存门保留：字节未到 OSS / PUT 失败仍会拦；保存时给“后台同步”轻提示
  assert.match(form, /请等待照片上传完成/);
  assert.match(form, /照片已上传，保存后自动同步/);
  assert.match(form, /hasIncompletePhotos/);
});

test('background sync photo upload path still registers metadata after bytes', () => {
  const dr = read('services/data-repository.js');
  // 离线/后台“upload”待办：仍是 上传+登记 一体，成功后移除待办
  assert.match(dr, /operation\.entity === 'photo' && operation\.action === 'upload'/);
  assert.match(dr, /photoStorage\.uploadPhoto\(/);
});

test('记录保存复用进行中的同步时，会补一次同步确保记录操作落库', () => {
  const dr = read('services/data-repository.js');
  assert.match(dr, /async function ensureRecordOperationSynced\(accountId, recordId\)/);
  assert.match(dr, /recordStillPending[\s\S]*await syncPendingRecords\(\);/);
  assert.match(dr, /await ensureRecordOperationSynced\(accountId, record\.id\);/);
  assert.match(dr, /await ensureRecordOperationSynced\(accountId, id\);/);
});