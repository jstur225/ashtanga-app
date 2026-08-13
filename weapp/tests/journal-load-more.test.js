const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Tab Two timeline scroll-to-bottom loads older months like the Web', () => {
  const js = read('pages/journal/journal.js');
  const wxml = read('pages/journal/journal.wxml');
  const wxss = read('pages/journal/journal.wxss');

  // 生命周期钩子与加载入口
  assert.match(js, /onReachBottom\(\)/);
  assert.match(js, /loadMoreTimeline\(\)/);
  assert.match(js, /onTimelineLoadMoreTap\(\)/);

  // 累计时间轴数据与状态
  assert.match(js, /timelineRecords: \[\]/);
  assert.match(js, /timelineLoadingMore: false/);
  assert.match(js, /timelineHasMore: false/);

  // 按月往前加载：取上一个月、按日期范围读记录、去草稿、排序、追加
  assert.match(js, /getTimelineMonthKey/);
  assert.match(js, /getRecordsByDateRange\(startDate, endDate\)/);
  assert.match(js, /record\.type !== '草稿'/);
  assert.match(js, /_olderTimelineRecords = this\._olderTimelineRecords\.concat\(this\.buildTimelineRecords\(valid\)\)/);
  assert.match(js, /rebuildTimeline\(\)/);

  // “到底”边界：用最早记录日期作为停止月份
  assert.match(js, /getEarliestRecordDate/);
  assert.match(js, /_timelineFloorKey/);
  assert.match(js, /lastKey <= floorKey/);

  // 切月时重置已加载的旧月份，避免串月
  assert.match(js, /changeMonth\(offset\) \{[\s\S]*this\._olderTimelineRecords = \[\];/);

  // WXML：时间轴渲染累计列表；底部三种状态
  assert.match(wxml, /wx:for="{{timelineRecords}}"/);
  assert.match(wxml, /timelineRecords\.length === 0/);
  assert.match(wxml, /timelineLoadingMore[\s\S]*加载中…/);
  assert.match(wxml, /timelineHasMore[\s\S]*上拉加载更多/);
  assert.match(wxml, /已经到底啦~/);

  // 样式：可点击的加载更多提示
  assert.match(wxss, /\.timeline-more-tap/);
});

test('dataRepository exposes getEarliestRecordDate for the timeline floor', () => {
  const dr = read('services/data-repository.js');
  const pr = read('services/practice-records.js');

  assert.match(dr, /async function getEarliestRecordDate\(\)/);
  assert.match(dr, /getEarliestRecordDate,/);
  assert.match(pr, /async function getEarliestRecordDate\(\)/);
  assert.match(pr, /getEarliestRecordDate,/);
  assert.match(pr, /order=date\.asc/);
  assert.match(pr, /limit=1/);
});