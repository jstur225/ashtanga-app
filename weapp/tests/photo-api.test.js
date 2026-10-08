const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('照片元数据接口按全部未删除照片重建记录 URL 列表', () => {
  const source = read('app/api/photos/route.ts');
  assert.match(source, /isOwnedOssObjectUrl/);
  assert.match(source, /ossUrl: oss_url/);
  assert.match(source, /ossKey: oss_key/);
  assert.match(source, /verifyOssObjectSize\(oss_url, file_size\)/);
  assert.match(source, /error: 'INVALID_OSS_URL'/);
  assert.match(source, /error: 'OSS_OBJECT_SIZE_MISMATCH'/);
  assert.match(source, /const activeUrls =/);
  assert.match(source, /photos: JSON\.stringify\(activeUrls\)/);
  assert.doesNotMatch(source, /photos: JSON\.stringify\(\[oss_url\]\)/);
});

test('签名接口缺少 OSS endpoint 时拒绝生成伪地址', () => {
  const source = read('app/api/oss-signature/route.ts');
  assert.match(source, /!OSS_BUCKET \|\| !OSS_ENDPOINT/);
});

test('删除单张照片后保留同一记录的其他照片', () => {
  const byRecord = read('app/api/photos/delete-by-record/route.ts');
  const byId = read('app/api/photos/[id]/route.ts');
  [byRecord, byId].forEach((source) => {
    assert.match(source, /remainingUrls/);
    assert.match(source, /photos: JSON\.stringify\(remainingUrls\)/);
  });
});
