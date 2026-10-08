const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const formJs = fs.readFileSync(
  path.join(__dirname, '../components/practice-record-form/index.js'),
  'utf8'
);
const formWxml = fs.readFileSync(
  path.join(__dirname, '../components/practice-record-form/index.wxml'),
  'utf8'
);
const practiceWxml = fs.readFileSync(
  path.join(__dirname, '../pages/practice/practice.wxml'),
  'utf8'
);
const formWxss = fs.readFileSync(
  path.join(__dirname, '../components/practice-record-form/index.wxss'),
  'utf8'
);
const practiceWxss = fs.readFileSync(
  path.join(__dirname, '../pages/practice/practice.wxss'),
  'utf8'
);

test('公共练习表单保留突破解锁开关状态，避免父级空 breakthrough 重置', () => {
  assert.match(formJs, /breakthroughEnabled: Boolean\(form\.breakthroughEnabled\)/);
  assert.match(formJs, /typeof form\.breakthroughEnabled === 'boolean'/);
  assert.match(formJs, /breakthroughEnabled: this\.data\.breakthroughEnabled/);
});

test('公共练习表单包含图片选择、预览、删除和 photos 保存字段', () => {
  assert.match(formWxml, /bindtap="choosePhoto"/);
  assert.match(formWxml, /catchtap="removePhoto"/);
  assert.match(formJs, /wx\.chooseMedia|wx\.chooseImage/);
  assert.match(formJs, /photos: this\.normalizePhotos\(this\.data\.value\.photos\)/);
});

test('照片在表单内真实上传，读取和上传时转圈，失败后停止并可重试', () => {
  assert.match(formJs, /dataRepository\.uploadRecordPhotos/);
  assert.match(formJs, /status === 'reading'/);
  assert.match(formJs, /status === 'uploading'/);
  assert.match(formJs, /retryPhoto/);
  assert.doesNotMatch(formJs, /已加入，保存后上传/);
  assert.match(formWxml, /photo-sync-overlay/);
  assert.match(formWxml, /photo-sync-spinner/);
  assert.match(formJs, /上传失败/);
  assert.match(formWxml, /照片上传中…/);
  assert.match(formWxss, /@keyframes photo-sync-spin/);
});

test('照片选择超过当前额度时整批拒绝，不再静默截取前几张', () => {
  assert.match(formJs, /count: 20/);
  assert.match(formJs, /selectedPaths\.length > remaining/);
  assert.match(formJs, /照片数量超出限制/);
  assert.match(formJs, /FREE 用户每条记录最多添加 1 张照片/);
  assert.match(formJs, /已取消添加/);
  assert.doesNotMatch(formJs, /\[\.\.\.currentPhotos, \.\.\.saved\]\.slice/);
});

test('游客没有照片权限，选择器打开前即要求绑定邮箱账号', () => {
  assert.match(formJs, /photoEnabled: \{ type: Boolean, value: false \}/);
  assert.match(formJs, /if \(!this\.properties\.photoEnabled\)/);
  assert.match(formJs, /getReasonMessage\('photo_account'\)/);
  assert.match(formWxml, /bindtap="choosePhoto"/);
});

test('照片区复刻网页版：无重复添加方框，三张以内三列正方形，更多时横向滑动', () => {
  assert.doesNotMatch(formWxml, /photo-add-tile/);
  assert.doesNotMatch(formWxml, />添加</);
  assert.match(formWxml, /value\.photos\.length <= 3/);
  assert.match(formWxml, /scroll-x/);
  assert.match(formWxss, /grid-template-columns: repeat\(3, 1fr\)/);
  assert.match(formWxss, /padding-bottom: 100%/);
  assert.match(formWxss, /photo-scroll-track[\s\S]*display: inline-flex/);
});

test('照片未全部成功前锁住保存，并向父页面报告上传状态', () => {
  assert.match(formJs, /hasIncompletePhotos/);
  assert.match(formJs, /triggerEvent\('uploadState'/);
  assert.match(formJs, /请等待照片上传完成/);
  assert.match(formWxml, /uploadingPhotos \|\| hasIncompletePhotos/);
});

test('图片上传和全屏编辑入口位于笔记框右下角，避免偏离网页版', () => {
  assert.match(formWxml, /class="notes-actions"/);
  assert.match(formWxml, /src="\{\{cameraIcon\}\}"/);
  assert.match(formWxml, /src="\{\{expandIcon\}\}"/);
  assert.match(formWxml, /bindtap="openFullscreenNotes"/);
  assert.doesNotMatch(formWxml, /上传练习照片/);
  assert.match(formWxml, /class="fullscreen-notes"/);
});

test('完成练习弹层不再重复显示表单已有的序列和时间摘要', () => {
  assert.doesNotMatch(practiceWxml, /completion-summary/);
  assert.doesNotMatch(practiceWxml, /completion-duration/);
});

test('完成标题和表单保持间距，全屏收起箭头使用居中 CSS chevron', () => {
  assert.match(practiceWxss, /\.completion-title[\s\S]*margin-bottom: 34rpx/);
  assert.doesNotMatch(formWxml, /fullscreen-chevron">⌄/);
  assert.match(formWxml, /<view class="fullscreen-chevron"><\/view>/);
  assert.match(formWxss, /\.fullscreen-collapse[\s\S]*align-items: center/);
  assert.match(formWxss, /\.fullscreen-chevron[\s\S]*rotate\(45deg\)/);
});
