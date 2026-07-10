const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8')
);
const indexSource = fs.readFileSync(
  path.join(__dirname, '../pages/index/index.js'),
  'utf8'
);
const journalSource = fs.readFileSync(
  path.join(__dirname, '../pages/journal/journal.js'),
  'utf8'
);
const landingSource = fs.readFileSync(
  path.join(__dirname, '../pages/landing/landing.js'),
  'utf8'
);
const landingTemplate = fs.readFileSync(
  path.join(__dirname, '../pages/landing/landing.wxml'),
  'utf8'
);
const landingStyles = fs.readFileSync(
  path.join(__dirname, '../pages/landing/landing.wxss'),
  'utf8'
);

test('小程序固定使用三个主 Tab', () => {
  assert.equal(appConfig.pages[0], 'pages/landing/landing');
  assert.equal(appConfig.window.navigationBarBackgroundColor, '#2A4B3C');
  assert.equal(appConfig.tabBar.custom, true);
  assert.deepEqual(
    appConfig.tabBar.list.map((item) => item.text),
    ['今日练习', '觉察日记', '我的']
  );
  assert.deepEqual(
    appConfig.tabBar.list.map((item) => item.pagePath),
    [
      'pages/practice/practice',
      'pages/journal/journal',
      'pages/profile/profile'
    ]
  );
});

test('落地页仅首次展示，已看过后进入今日练习', () => {
  assert.match(landingSource, /const STORAGE_KEY = 'has_seen_landing'/);
  assert.match(landingSource, /wx\.getStorageSync\(STORAGE_KEY\)/);
  assert.match(landingSource, /wx\.setStorageSync\(STORAGE_KEY, true\)/);
  assert.match(landingSource, /wx\.switchTab\(\{\s*url: '\/pages\/practice\/practice'/);
});

test('落地页按小程序能力修正布局、图标和翻译', () => {
  assert.doesNotMatch(landingTemplate, /<(nav|section)\b/);
  assert.doesNotMatch(landingTemplate, /data:image\/svg\+xml/);
  assert.doesNotMatch(landingTemplate, /&lt;br\/&gt;|Rest In Peace|Scroll|Est\. 2026|Journal/);
  assert.match(landingTemplate, /始于 2026/);
  assert.match(landingTemplate, /向下/);
  assert.match(landingTemplate, /谨以纪念/);
  assert.match(landingStyles, /\.landing-navbar[\s\S]*min-height: calc\(124rpx \+ env\(safe-area-inset-top\)\)/);
  assert.match(landingStyles, /\.navbar-icon[\s\S]*border-radius: 50%/);
  assert.match(landingStyles, /@keyframes fadeInUp/);
  assert.match(landingStyles, /@keyframes moonRotate/);
});

test('登录或游客模式都进入今日练习，按月记录归属觉察日记', () => {
  assert.match(indexSource, /wx\.switchTab\(\{\s*url: '\/pages\/practice\/practice'/);
  assert.match(indexSource, /enterGuest\(\)/);
  assert.doesNotMatch(indexSource, /getRecentRecords/);
  assert.match(journalSource, /dataRepository\.getRecordsByDateRange\(startDate, endDate\)/);
  assert.doesNotMatch(journalSource, /requireUser/);
});

test('觉察日记包含六个工具按钮、Moon Day 和时光轴', () => {
  const journalTemplate = fs.readFileSync(
    path.join(__dirname, '../pages/journal/journal.wxml'),
    'utf8'
  );
  assert.equal((journalTemplate.match(/class="calendar-control/g) || []).length, 6);
  assert.match(journalTemplate, /class="moon-image"/);
  assert.match(journalTemplate, /class="monthly-stats-card"/);
  assert.match(journalTemplate, /class="timeline"/);
  assert.match(journalSource, /'2026-07-14': 'new'/);
  assert.match(journalSource, /practiced: true/);
});

test('三个 Tab 页面文件均存在', () => {
  for (const page of ['practice/practice', 'journal/journal', 'profile/profile']) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) {
      assert.equal(
        fs.existsSync(path.join(__dirname, `../pages/${page}.${extension}`)),
        true,
        `${page}.${extension} should exist`
      );
    }
  }
});
