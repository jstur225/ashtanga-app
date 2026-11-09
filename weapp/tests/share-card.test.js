const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const journal = read('pages/journal/journal.js');
const journalWxml = read('pages/journal/journal.wxml');
const recordJs = read('components/record-share-card/index.js');
const recordWxml = read('components/record-share-card/index.wxml');
const recordWxss = read('components/record-share-card/index.wxss');
const monthlyJs = read('components/monthly-stats-share-card/index.js');
const monthlyWxml = read('components/monthly-stats-share-card/index.wxml');
const canvasUtil = read('utils/share-card-canvas.js');

test('单条分享卡接入全部照片和头像，不再按固定行数截断笔记', () => {
  assert.match(journal, /photos: Array\.isArray\(record\.photos\) \? record\.photos\.filter\(Boolean\) : \[\]/);
  assert.match(journal, /profileAvatar: profile\.avatar \|\| ''/);
  assert.match(recordJs, /wrapText\(measureCtx/);
  assert.doesNotMatch(recordJs, /maxLines|truncateText/);
  assert.match(recordJs, /photoSources[\s\S]*Promise\.all[\s\S]*loadCanvasImage/);
  assert.match(recordJs, /photoLayouts[\s\S]*const cardHeight = Math\.max/);
  assert.match(recordJs, /loadCanvasImage\(canvas, data\.profileAvatar\)/);
});

test('两张分享卡复用高清保存工具，月度卡保留原有缩放', () => {
  for (const source of [recordJs, monthlyJs]) {
    assert.match(source, /getCanvasScale/);
    assert.match(source, /saveCanvasToAlbum/);
  }
  assert.match(monthlyJs, /previewPercent/);
  assert.match(monthlyJs, /zoomOut\(\)/);
  assert.match(monthlyJs, /zoomIn\(\)/);
  assert.match(monthlyWxml, /scroll-x/);
  assert.match(monthlyWxml, /scroll-y/);
  assert.match(monthlyWxml, /bindtap="resetZoom"/);
  assert.match(recordWxml, /scroll-y/);
  assert.doesNotMatch(recordWxml, /scroll-x|zoomOut|zoomIn|resetZoom|previewPercent/);
  assert.doesNotMatch(recordJs, /previewScale|previewPercent|setPreviewScale|zoomOut|zoomIn|resetZoom/);
  assert.doesNotMatch(recordWxml, /\{\{[^}]*\([^}]*\)/);
  assert.match(canvasUtil, /MAX_CANVAS_EDGE = 8192/);
  assert.match(canvasUtil, /Math\.min\(3, getSystemPixelRatio\(\), safeScale\)/);
  assert.match(canvasUtil, /quality: 1/);
  assert.match(canvasUtil, /wx\.saveImageToPhotosAlbum/);
});

test('单条分享卡打开时使用原生内容即时预览，Canvas 只在保存时生成', () => {
  assert.match(recordWxml, /id="recordSharePreview"/);
  assert.match(recordWxml, /class="preview-notes"/);
  assert.match(recordWxml, /lazy-load/);
  assert.match(recordWxml, /class="export-canvas"/);
  assert.doesNotMatch(recordWxml, /正在整理卡片|生成中\.\.\./);
  assert.doesNotMatch(recordJs, /setTimeout\(\(\) => this\.drawCard\(\), 80\)/);
  assert.match(recordJs, /async saveImage\(\)[\s\S]*await this\.drawCard\(\)/);
});

test('分享弹层锁住背景，只有卡片预览滚动且底部按钮固定在滚动层外', () => {
  assert.match(recordWxml, /class="share-mask"[\s\S]*catchtouchmove="preventBackgroundScroll"/);
  const scrollEnd = recordWxml.indexOf('</scroll-view>');
  const actionsStart = recordWxml.indexOf('<view class="share-actions">');
  assert.ok(scrollEnd >= 0 && actionsStart > scrollEnd, 'actions should be outside preview scroll-view');
  assert.match(journalWxml, /<page-meta page-style="\{\{showRecordShare \? 'overflow: hidden;' : ''\}\}"/);
  assert.match(recordWxss, /\.share-mask[\s\S]*position:\s*fixed/);
  assert.match(recordWxss, /\.share-modal[\s\S]*height:\s*100%/);
  assert.match(recordWxss, /\.share-preview-scroll[\s\S]*flex:\s*1/);
  assert.match(recordWxss, /\.share-actions[\s\S]*flex:\s*0 0 auto/);
});

test('点击分享先用缓存同步打开，全年统计只在后台校准', () => {
  assert.match(journal, /getCachedRecordsByDateRange\(startDate, endDate\)/);
  assert.match(journal, /this\.setData\(\{ showRecordShare: true, recordShareData \}/);
  assert.match(journal, /void this\.refreshRecordShareStats\(recordShareData\.recordId\)/);
  assert.doesNotMatch(journal, /const recordShareData = await this\.buildRecordShareData/);
});
