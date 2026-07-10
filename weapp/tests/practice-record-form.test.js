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
