const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8')
);
const appSource = fs.readFileSync(
  path.join(__dirname, '../app.js'),
  'utf8'
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
const customTabSource = fs.readFileSync(
  path.join(__dirname, '../custom-tab-bar/index.js'),
  'utf8'
);
const customTabStyles = fs.readFileSync(
  path.join(__dirname, '../custom-tab-bar/index.wxss'),
  'utf8'
);
const practiceTemplate = fs.readFileSync(
  path.join(__dirname, '../pages/practice/practice.wxml'),
  'utf8'
);
const practiceStyles = fs.readFileSync(
  path.join(__dirname, '../pages/practice/practice.wxss'),
  'utf8'
);
const profileSource = fs.readFileSync(
  path.join(__dirname, '../pages/profile/profile.js'),
  'utf8'
);
const profileTemplate = fs.readFileSync(
  path.join(__dirname, '../pages/profile/profile.wxml'),
  'utf8'
);
const accountGuestTemplate = fs.readFileSync(
  path.join(__dirname, '../components/account-guest-panel/index.wxml'),
  'utf8'
);
const profileStyles = fs.readFileSync(
  path.join(__dirname, '../pages/profile/profile.wxss'),
  'utf8'
);
const localProfileSource = fs.readFileSync(
  path.join(__dirname, '../services/local-profile.js'),
  'utf8'
);
const dataCapsuleSource = fs.readFileSync(
  path.join(__dirname, '../services/data-capsule.js'),
  'utf8'
);
const moonDaysSource = fs.readFileSync(
  path.join(__dirname, '../services/moon-days.js'),
  'utf8'
);
const practiceSource = fs.readFileSync(
  path.join(__dirname, '../pages/practice/practice.js'),
  'utf8'
);
const guidedAudioSource = fs.readFileSync(
  path.join(__dirname, '../services/guided-audio.js'),
  'utf8'
);
const annotationManagerSource = fs.readFileSync(
  path.join(__dirname, '../components/annotation-manager/index.js'),
  'utf8'
);
const annotationManagerTemplate = fs.readFileSync(
  path.join(__dirname, '../components/annotation-manager/index.wxml'),
  'utf8'
);
const annotationManagerStyles = fs.readFileSync(
  path.join(__dirname, '../components/annotation-manager/index.wxss'),
  'utf8'
);
const journalConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../pages/journal/journal.json'), 'utf8')
);
const monthlyShareSource = fs.readFileSync(
  path.join(__dirname, '../components/monthly-stats-share-card/index.js'),
  'utf8'
);
const monthlyShareTemplate = fs.readFileSync(
  path.join(__dirname, '../components/monthly-stats-share-card/index.wxml'),
  'utf8'
);
const monthlyShareStyles = fs.readFileSync(
  path.join(__dirname, '../components/monthly-stats-share-card/index.wxss'),
  'utf8'
);
const recordShareSource = fs.readFileSync(
  path.join(__dirname, '../components/record-share-card/index.js'),
  'utf8'
);
const recordShareTemplate = fs.readFileSync(
  path.join(__dirname, '../components/record-share-card/index.wxml'),
  'utf8'
);
const recordShareStyles = fs.readFileSync(
  path.join(__dirname, '../components/record-share-card/index.wxss'),
  'utf8'
);
const shareCanvasSource = fs.readFileSync(
  path.join(__dirname, '../utils/share-card-canvas.js'),
  'utf8'
);

test('小程序保留三个主包 Tab，并通过分包接入第四个体式库入口', () => {
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
  assert.deepEqual(appConfig.subPackages, [{
    root: 'pose-package',
    pages: ['pages/poses/poses']
  }]);
});

test('落地页仅首次展示，已看过后进入今日练习', () => {
  assert.match(landingSource, /const STORAGE_KEY = 'has_seen_landing'/);
  assert.match(landingSource, /wx\.getStorageSync\(STORAGE_KEY\)/);
  assert.match(landingSource, /wx\.setStorageSync\(STORAGE_KEY, true\)/);
  assert.match(landingSource, /wx\.switchTab\(\{\s*url: '\/pages\/practice\/practice'/);
});

test('小程序悬浮导航按网页版真实按钮尺寸放大并保留底部安全区', () => {
  assert.match(customTabStyles, /\.tab-pill[\s\S]*max-width: 650rpx/);
  assert.match(customTabStyles, /\.tab-item[\s\S]*min-height: 104rpx/);
  assert.match(customTabStyles, /\.tab-icon[\s\S]*height: 40rpx[\s\S]*width: 40rpx/);
  assert.match(customTabStyles, /\.tab-text[\s\S]*font-size: 20rpx/);
  assert.match(customTabStyles, /env\(safe-area-inset-bottom\)/);
  assert.match(customTabStyles, /backdrop-filter: blur\(16rpx\)[\s\S]*background: rgba\(255, 255, 255, 0\.88\)/);
  assert.match(profileStyles, /calc\(180rpx \+ env\(safe-area-inset-bottom\)\)/);
});

test('悬浮导航按网页版顺序显示今日练习、觉察日记、体式库、我的数据', () => {
  assert.match(customTabSource, /text: '今日练习'[\s\S]*text: '觉察日记'[\s\S]*text: '体式库'[\s\S]*text: '我的数据'/);
  assert.match(customTabSource, /\/pose-package\/pages\/poses\/poses/);
  assert.match(customTabSource, /\/images\/icons\/tab-library\.png/);
  assert.match(customTabSource, /wx\.navigateTo\(\{ url: path \}\)/);
  assert.match(profileSource, /setData\(\{ selected: 3, hidden: false \}\)/);
});

test('游客冷启动和显式进入游客模式都会初始化教程觉察笔记', () => {
  assert.match(appSource, /ensureTutorialRecord\(\)/);
  assert.match(indexSource, /enterGuest\(\)[\s\S]*ensureTutorialRecord\(\)/);
  assert.match(profileSource, /logout\(\)[\s\S]*ensureTutorialRecord\(\)/);
});

test('落地页按小程序能力修正布局、图标和翻译', () => {
  assert.doesNotMatch(landingTemplate, /<(nav|section)\b/);
  assert.doesNotMatch(landingTemplate, /data:image\/svg\+xml/);
  assert.doesNotMatch(landingTemplate, /&lt;br\/&gt;|Rest In Peace|Scroll|Est\. 2026|Journal/);
  assert.doesNotMatch(landingTemplate, /◷|□|▦|◇|☕|⌁|✦|☾|≈|→|&amp;/);
  assert.match(landingTemplate, /始于 2026/);
  assert.match(landingTemplate, /向下/);
  assert.match(landingTemplate, /谨以纪念/);
  assert.match(landingTemplate, /src="\{\{icons\.timer\}\}"/);
  assert.match(landingTemplate, /src="\{\{icons\.bookOpen\}\}"/);
  assert.match(landingTemplate, /src="\{\{icons\.barChart3\}\}"/);
  assert.match(landingTemplate, /src="\{\{icons\.shield\}\}"/);
  assert.match(landingTemplate, /src="\{\{icons\.coffee\}\}"/);
  assert.match(landingTemplate, /src="\{\{icons\.github\}\}"/);
  assert.match(landingSource, /timer: '\/images\/icons\/landing-timer\.png'/);
  assert.match(landingSource, /bookOpen: '\/images\/icons\/landing-bookOpen\.png'/);
  assert.match(landingSource, /barChart3: '\/images\/icons\/landing-barChart3\.png'/);
  assert.match(landingSource, /shield: '\/images\/icons\/landing-shield\.png'/);
  assert.match(landingSource, /coffee: '\/images\/icons\/landing-coffee\.png'/);
  assert.match(landingSource, /github: '\/images\/icons\/landing-github\.png'/);
  assert.match(landingStyles, /\.landing-navbar[\s\S]*padding-top: calc\(180rpx \+ env\(safe-area-inset-top\)\)/);
  assert.match(landingStyles, /\.navbar-icon[\s\S]*border-radius: 50%/);
  assert.match(landingStyles, /\.navbar-slogan[\s\S]*white-space: nowrap/);
  assert.match(landingStyles, /@keyframes fadeInUp/);
  assert.match(landingStyles, /@keyframes moonRotate/);
});

test('今日练习音频显示不在 WXML 中调用页面方法，口令音频不打进审核包', () => {
  assert.doesNotMatch(practiceTemplate, /\{\{formatAudioTime\(/);
  assert.match(practiceTemplate, /\{\{guidedAudioCurrentText\}\}/);
  assert.match(practiceTemplate, /\{\{guidedAudioDurationText\}\}/);
  assert.match(guidedAudioSource, /guidedAudioCache\.AUDIO_URL/);
  assert.equal(
    fs.existsSync(path.join(__dirname, '../audio/guruji-led-primary.m4a')),
    false,
    'large guided audio should be streamed remotely, not bundled in the mini program package'
  );
});

test('今日练习背景和按钮质感按网页版真源统一', () => {
  assert.equal(appConfig.window.backgroundColor, '#F9F8F6');
  assert.match(practiceStyles, /\.practice-page\s*\{[\s\S]*?background: #F9F8F6/);
  assert.match(practiceStyles, /\.option-card\s*\{[\s\S]*?background: #F9F8F6;[\s\S]*?border: 1rpx solid rgba\(245, 245, 244, 0\.5\);[\s\S]*?box-shadow: 0 8rpx 32rpx rgba\(0, 0, 0, 0\.06\)/);
  assert.doesNotMatch(practiceStyles, /background: rgba\(255, 255, 255, 0\.84\)/);
  assert.doesNotMatch(practiceStyles, /border: 1rpx solid rgba\(42, 75, 60, 0\.14\)/);
  assert.match(practiceStyles, /\.option-card\.selected\s*\{[\s\S]*?box-shadow: 0 16rpx 48rpx rgba\(45, 90, 39, 0\.3\)/);
  assert.match(practiceStyles, /\.option-card\.custom\s*\{[\s\S]*?border: 2rpx dashed rgba\(134, 140, 136, 0\.3\)/);
  assert.match(practiceStyles, /\.start-button\s*\{[\s\S]*?background: rgba\(232, 237, 231, 0\.5\)/);
});

test('今日练习和我的先显示本机快照，再后台刷新云端', () => {
  assert.match(practiceSource, /loading: false/);
  assert.match(practiceSource, /onLoad\(\)[\s\S]*this\.hydrateFromCache\(\)/);
  assert.match(practiceSource, /getCachedPracticeOptions\(\)/);
  assert.match(profileSource, /loading: false/);
  assert.match(profileSource, /onShow\(\)[\s\S]*this\.hydrateFromCache\(\)/);
  assert.match(profileSource, /getCachedRecordsByDateRange/);
  assert.doesNotMatch(profileSource, /await paymentService\.recoverPendingOrders\(\{ maxOrders: 3 \}\)/);
});

test('三个主页面短时间往返时合并后台刷新，不重复轰炸接口', () => {
  for (const source of [practiceSource, journalSource, profileSource]) {
    assert.match(source, /pageRefreshGate\.run\(this\.getRefreshGateKey\(\)/);
  }
  assert.match(practiceSource, /force: true/);
});

test('唱诵和口令跟练在按钮状态层互斥，口令选中时提前预热音频', () => {
  assert.match(practiceSource, /nextData\.selectedOptionId = ''/);
  assert.match(practiceSource, /口令包含唱诵，不能同时开启/);
  assert.match(practiceSource, /nextData\.chantEnabled = false/);
  assert.match(practiceSource, /guidedAudio\.preload\(\)/);
  assert.match(guidedAudioSource, /function preload\(\)/);
  assert.match(guidedAudioSource, /audioContext\.autoplay = false/);
  assert.match(guidedAudioSource, /shouldPlayOnReady = true/);
});

test('登录或游客模式都进入今日练习，按月记录归属觉察日记', () => {
  assert.match(indexSource, /wx\.switchTab\(\{\s*url: '\/pages\/practice\/practice'/);
  assert.match(indexSource, /enterGuest\(\)/);
  assert.doesNotMatch(indexSource, /getRecentRecords/);
  assert.match(journalSource, /dataRepository\.getRecordsByDateRange\(startDate, endDate\)/);
  assert.doesNotMatch(journalSource, /requireUser/);
});

test('今日练习人数请求失败不会阻塞 Tab1 的本地练习功能', () => {
  assert.match(
    practiceSource,
    /getTodayPracticeCount\(\{ force: Boolean\(options\.forceTodayCount\) \}\)[\s\S]*\.catch\(\(\) => Number\(this\.data\.todayCount\) \|\| 0\)/
  );
  assert.match(
    practiceSource,
    /Promise\.all\(\[[\s\S]*dataRepository\.getPracticeOptions\(\)[\s\S]*dataRepository\.getRecordsByDateRange/
  );
});

test('觉察日记包含六个工具按钮、Moon Day 和时光轴', () => {
  const journalTemplate = fs.readFileSync(
    path.join(__dirname, '../pages/journal/journal.wxml'),
    'utf8'
  );
  assert.equal((journalTemplate.match(/class="calendar-control/g) || []).length, 6);
  assert.match(journalTemplate, /class="moon-image"/);
  assert.match(journalTemplate, /class="monthly-stats-card"/);
  assert.match(journalTemplate, /bindtap="openMonthlyShare"/);
  assert.match(journalTemplate, /monthly-stats-share-card/);
  assert.match(journalTemplate, /record-share-card/);
  assert.match(journalTemplate, /catchtap="openRecordShare"/);
  assert.match(journalTemplate, /timeline-share-note/);
  assert.equal(
    journalConfig.usingComponents['monthly-stats-share-card'],
    '../../components/monthly-stats-share-card/index'
  );
  assert.equal(
    journalConfig.usingComponents['record-share-card'],
    '../../components/record-share-card/index'
  );
  assert.match(journalSource, /buildMonthlyShareData\(\)/);
  assert.match(journalSource, /buildRecordShareData/);
  assert.match(journalSource, /openRecordShare/);
  assert.match(journalSource, /showRecordShare/);
  assert.doesNotMatch(journalSource, /drawMonthlyShareCard|saveMonthlyShareImage|wx\.createCanvasContext\('monthlyStatsCanvas'/);
  assert.match(monthlyShareTemplate, /id="monthlyStatsCanvas" type="2d"/);
  assert.doesNotMatch(monthlyShareTemplate, /canvas-id="monthlyStatsCanvas"/);
  assert.match(monthlyShareSource, /wx\.createSelectorQuery\(\)[\s\S]*select\('#monthlyStatsCanvas'\)/);
  assert.match(monthlyShareSource, /getCanvasScale\(CARD_WIDTH, CARD_HEIGHT\)/);
  assert.match(monthlyShareSource, /saveCanvasToAlbum/);
  assert.match(monthlyShareSource, /loadCanvasImage\(canvas, data\.profileAvatar\)/);
  assert.match(monthlyShareTemplate, /scroll-x scroll-y/);
  assert.match(monthlyShareTemplate, /bindtap="zoomOut"/);
  assert.match(monthlyShareStyles, /display:block/);
  assert.match(monthlyShareStyles, /width:320px/);
  assert.match(recordShareTemplate, /id="recordShareCanvas" type="2d"/);
  assert.doesNotMatch(recordShareTemplate, /canvas-id="recordShareCanvas"/);
  assert.match(recordShareSource, /wx\.createSelectorQuery\(\)[\s\S]*select\('#recordShareCanvas'\)/);
  assert.match(recordShareSource, /getCanvasScale\(CARD_WIDTH, cardHeight\)/);
  assert.match(recordShareSource, /saveCanvasToAlbum/);
  assert.match(recordShareSource, /wrapText/);
  assert.match(recordShareSource, /photoSources[\s\S]*loadCanvasImage/);
  assert.match(recordShareSource, /const cardHeight = Math\.max/);
  assert.match(recordShareSource, /roundRect\(ctx, 20, 96, 280, 34, 17\)/);
  assert.doesNotMatch(recordShareSource, /ctx\.fillRect\(20, statsY - 22, 280, 76\)/);
  assert.match(recordShareTemplate, /scroll-y/);
  assert.doesNotMatch(recordShareTemplate, /scroll-x|zoomOut|zoomIn|resetZoom|previewPercent/);
  assert.doesNotMatch(recordShareSource, /previewScale|setPreviewScale|zoomOut|zoomIn|resetZoom/);
  assert.match(recordShareStyles, /\.export-canvas[\s\S]*left:\s*-10000px/);
  assert.match(recordShareStyles, /width:\s*320px/);
  assert.match(journalTemplate, /<page-meta page-style="\{\{showRecordShare \? 'overflow: hidden;' : ''\}\}"/);
  assert.match(shareCanvasSource, /getSystemInfoSync\(\)/);
  assert.match(shareCanvasSource, /MAX_CANVAS_EDGE = 8192/);
  assert.match(shareCanvasSource, /wx\.saveImageToPhotosAlbum/);
  assert.match(journalTemplate, /class="timeline"/);
  assert.match(journalSource, /require\('\.\.\/\.\.\/services\/moon-days'\)/);
  assert.match(moonDaysSource, /'2026-07-14': 'new'/);
  assert.match(moonDaysSource, /'2027-09-30': 'new'/);
  assert.match(journalSource, /practiced: true/);
  assert.match(journalSource, /previewAnnotationColors: annotationColors\.slice\(0, 3\)/);
  assert.match(journalSource, /extraAnnotationCount: Math\.max\(0, annotationColors\.length - 3\)/);
  assert.match(journalTemplate, /wx:for="\{\{item\.previewAnnotationColors\}\}"/);
  assert.doesNotMatch(journalTemplate, /annotationColors\.slice/);
  assert.match(journalSource, /annotationTypeIdMap/);
  assert.match(journalSource, /optimisticId/);
  assert.match(journalSource, /const resolveTypeId = \(typeId\) => annotationTypeIdMap\[typeId\] \|\| typeId/);
  assert.match(journalSource, /showAnnotationManager: false/);
  assert.match(journalSource, /this\.renderCachedCalendar\(\);[\s\S]*this\.loadCalendar\(\{ preserveExisting: true \}\)/);
});

test('今日练习 WXML 动态属性不跨行，兼容真机严格解析器', () => {
  assert.doesNotMatch(practiceTemplate, /\b(?:class|src)="[^"]*\r?\n/);
});

test('标注管理器不在 WXML 中调用数组或页面方法，创建后由本地 displayTypes 渲染', () => {
  assert.match(annotationManagerSource, /localTypes/);
  assert.match(annotationManagerSource, /displayTypes/);
  assert.match(annotationManagerSource, /optimisticType/);
  assert.match(annotationManagerSource, /const baseYear = this\.properties\.calendarYear \|\| now\.getFullYear\(\)/);
  assert.match(annotationManagerSource, /previewAnnotationColors/);
  assert.match(annotationManagerTemplate, /wx:for="\{\{displayTypes\}\}"/);
  assert.match(annotationManagerTemplate, /wx:for="\{\{item\.previewAnnotationColors\}\}"/);
  assert.doesNotMatch(annotationManagerTemplate, /types\.slice|getDateAnnotationColors\(/);
  assert.doesNotMatch(annotationManagerSource, /new Set\(/);
  assert.match(annotationManagerStyles, /\.ann-type-selected[\s\S]*box-shadow: none/);
  assert.match(annotationManagerStyles, /\.ann-type-selected \.ann-type-dot[\s\S]*transform: scale\(1\.08\)/);
  assert.match(annotationManagerTemplate, /class="ann-cal-slot"/);
  assert.match(annotationManagerStyles, /\.ann-cal-slot[\s\S]*justify-content: center/);
  assert.doesNotMatch(annotationManagerStyles, /\.ann-cal-grid > view/);
  assert.match(annotationManagerStyles, /\.ann-cal-day[\s\S]*height: 76rpx[\s\S]*width: 76rpx/);
  assert.match(annotationManagerStyles, /\.ann-color-grid[\s\S]*grid-template-columns: repeat\(9, 56rpx\)[\s\S]*justify-items: center/);
  assert.match(annotationManagerStyles, /\.ann-form-input[\s\S]*max-width: 100%/);
  assert.match(annotationManagerStyles, /\.ann-form-actions-single \.ann-form-btn[\s\S]*width: 100%/);
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

test('小程序 UI 素材均使用包内资源，避免审核包依赖网页素材路径', () => {
  assert.match(customTabSource, /\/images\/icons\/tab-calendar\.png/);
  assert.match(customTabSource, /\/images\/icons\/tab-bookOpen\.png/);
  assert.match(customTabSource, /\/images\/icons\/tab-user\.png/);
  assert.match(profileTemplate, /\/images\/icons\/profile-settings\.png/);
  assert.match(profileTemplate, /\/images\/icons\/profile-user\.png/);
  assert.match(profileTemplate, /\/images\/icons\/profile-camera\.png/);
  assert.match(profileTemplate, /\/images\/icons\/profile-calendar\.png/);
  assert.match(practiceTemplate, /src="\/images\/icon\.png"/);
  assert.match(practiceTemplate, /\/images\/icon-light\.png/);
  assert.match(practiceTemplate, /\/images\/icon-green\.png/);
  assert.match(journalSource, /\/images\/icons\/journal-cloud\.png/);
  assert.match(moonDaysSource, /\/images\/moon-phase\//);

  const runtimeFiles = [];
  const collect = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'tests') collect(fullPath);
      } else if (/\.(js|wxml|wxss|json)$/.test(entry.name)) {
        runtimeFiles.push(fullPath);
      }
    }
  };
  collect(path.join(__dirname, '..'));

  for (const file of runtimeFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /data:image/, `${file} should not inline UI images`);
    assert.doesNotMatch(
      source,
      /https:\/\/ash\.ashtangalife\.online\/(?:icon|icon-light|icon-green|moon-phase)/,
      `${file} should not depend on web-hosted UI assets`
    );
  }
});

test('我的页复刻网页版我的数据主屏，且不保留 PWA 安装按钮', () => {
  assert.match(profileTemplate, /settings-entry/);
  assert.doesNotMatch(profileTemplate, />⚙<|>♙<|>⌁</);
  assert.doesNotMatch(profileTemplate, /安装到主屏幕|PWA|pwa-install|install-app/);
  assert.match(profileTemplate, /class="avatar-wrap green-gradient"/);
  assert.match(profileTemplate, /class="pro-badge/);
  assert.match(profileTemplate, /升级 Pro 解锁更多功能/);
  assert.match(profileTemplate, /ID: \{\{maskedUserId\}\}/);
  assert.match(profileTemplate, /总熬汤天数/);
  assert.match(profileTemplate, /总熬汤时长（小时）/);
  assert.match(profileTemplate, /平均分钟/);
  assert.match(profileTemplate, /练习是连贯的珍珠/);
  assert.match(profileTemplate, /暂无练习数据/);
  assert.doesNotMatch(profileTemplate, /wx:else class="heatmap-body"/);
  assert.match(profileStyles, /\.total-stats-grid/);
  assert.match(profileStyles, /\.heatmap-card/);
  assert.match(profileStyles, /\.dot-grid[\s\S]*repeat\(16/);
});

test('我的页设置弹层包含四个网页版设置分区和数据管理真实按钮', () => {
  for (const label of ['个人资料', '会员', '账户同步', '数据管理']) {
    assert.match(profileSource, new RegExp(`label: '${label}'`));
  }
  for (const buttonText of [
    '保存设置',
    '开通',
    '立即同步',
    '退出登录',
    '同步卡住？点击重置',
    '修改密码',
    '导出数据胶囊',
    '导入数据胶囊',
    '运行日志',
    '清空本地数据'
  ]) {
    assert.match(profileTemplate, new RegExp(buttonText));
  }
  for (const buttonText of ['去绑定邮箱', '继续使用本地存储', '点击登录']) {
    assert.match(accountGuestTemplate, new RegExp(buttonText));
  }
  assert.match(profileTemplate, /<account-guest-panel/);
  assert.match(profileTemplate, /退出选项/);
  assert.doesNotMatch(profileTemplate, /激活码开通|placeholder="激活码"/);
  assert.match(profileTemplate, /membership-head-action[\s\S]*membership-sparkles-white\.svg/);
  assert.match(profileSource, /const dataCapsule = require\('\.\.\/\.\.\/services\/data-capsule'\)/);
  assert.match(profileTemplate, /bindtap="openExportShell"/);
  assert.match(profileTemplate, /bindtap="openImportShell"/);
  assert.match(profileTemplate, /bindtap="openDebugLogShell"/);
  assert.match(profileTemplate, /bindtap="confirmClearLocalData"/);
  assert.match(profileTemplate, /未开启云端同步，建议定期备份数据/);
  assert.match(profileTemplate, /settings-copy\.svg/);
  assert.match(profileTemplate, /settings-download\.svg/);
  assert.match(profileTemplate, /settings-bug\.svg/);
  assert.match(profileTemplate, /settings-trash-2\.svg/);
  assert.match(profileTemplate, /危险操作警告/);
  assert.match(profileTemplate, /确认删除/);
  assert.match(profileTemplate, /最后一次确认/);
  assert.match(profileTemplate, /bindtap="completeClearLocalData"/);
  assert.match(profileTemplate, /bindtap="copyExportData"/);
  assert.match(profileTemplate, /bindtap="pasteImportData"/);
  assert.match(profileTemplate, /bindtap="confirmImportData"/);
  assert.match(profileTemplate, /import-clipboard-paste\.svg/);
  assert.match(profileTemplate, /import-check\.svg/);
  assert.match(profileTemplate, /数据胶囊内容/);
  assert.match(profileSource, /wx\.setStorageSync\('weapp_guest_mode_enabled', true\)/);
  assert.match(profileSource, /completed_records/);
  assert.match(profileTemplate, /bindtap="exportDebugLogFile"/);
  assert.match(profileTemplate, /点击下方按钮导出 JSON 文件发给开发者/);
  assert.match(profileTemplate, /debug-download-white\.svg/);
  assert.match(profileTemplate, /正在生成日志\.\.\./);
  assert.match(profileSource, /debugLogExport\.prepareDebugLogFiles\(debugLogText\)/);
  assert.match(profileSource, /exportDebugLogFile\(\) \{\s*this\.sharePreparedDebugLogFile\('json'\);/);
  assert.match(profileSource, /const sharePromise = debugLogExport\.shareDebugLogFile\(file\);/);
  assert.doesNotMatch(profileSource, /async exportDebugLogFile\(\)/);
  assert.doesNotMatch(profileTemplate, /bindtap="(?:copyDebugLog|refreshDebugLog|clearDebugLog)"/);
  assert.match(dataCapsuleSource, /recent_events: runtimeErrors\.getRecentEvents\(200\)/);
  assert.doesNotMatch(profileTemplate, /data-label="(?:复制数据胶囊|导入数据胶囊|运行日志|清空本地数据)" bindtap="placeholderAction"/);
  assert.doesNotMatch(profileSource, /placeholderAction|功能下一步接入/);
  assert.match(dataCapsuleSource, /exportLocalData/);
  assert.match(profileSource, /dataCapsule\.exportLocalData\(\{[\s\S]*this\.profileRecords/);
  assert.match(profileSource, /dataRepository\.getRecordsByDateRange\(startDate, endDate\)/);
  assert.match(dataCapsuleSource, /importLocalData/);
  assert.match(dataCapsuleSource, /clearLocalData/);
  assert.match(dataCapsuleSource, /buildDebugLog/);
  assert.match(profileStyles, /\.settings-sheet/);
  assert.match(profileStyles, /\.data-textarea/);
  assert.match(profileStyles, /\.settings-tab\.membership-tab\.active[\s\S]*#C1A268/);
  assert.match(profileStyles, /\.center-modal/);
});

test('我的页年度热力图使用本地记录和包内 Moon Day 图片', () => {
  assert.match(profileSource, /dataRepository\.getRecordsByDateRange\(startDate, endDate\)/);
  assert.doesNotMatch(profileSource, /cloudRecords\.getRecordsByDateRange\(startDate, endDate\)/);
  assert.match(profileSource, /dataRepository\.getPracticeOptions\(\)/);
  assert.match(profileSource, /auth\.getStoredSession\(\)/);
  assert.match(profileSource, /require\('\.\.\/\.\.\/services\/moon-days'\)/);
  assert.match(profileSource, /getMoonType\(date\)/);
  assert.match(profileSource, /getMoonIcon\(date\)/);
  assert.match(profileTemplate, /class="moon-dot-image"/);
  assert.match(profileTemplate, /class="moon-spark"/);
  assert.match(profileStyles, /\.heat-dot\.green-gradient-1[\s\S]*#C4CCBE/);
  assert.match(profileStyles, /\.heat-dot\.green-gradient-4[\s\S]*#1A3D1A/);
});

test('我的页个人资料表单按网页版设置源码复刻关键细节', () => {
  assert.match(profileTemplate, /class="profile-edit-avatar"/);
  assert.match(profileTemplate, /class="camera-dot"/);
  assert.match(profileStyles, /\.profile-edit-avatar[\s\S]*overflow: visible/);
  assert.match(profileTemplate, /value="\{\{draftProfileName\}\}" bindinput="onProfileNameInput"/);
  assert.match(profileTemplate, /class="profile-input signature-input"/);
  assert.match(profileTemplate, /value="\{\{draftProfileSignature\}\}" bindinput="onProfileSignatureInput"/);
  assert.doesNotMatch(profileTemplate, /class="profile-textarea"/);
  assert.match(profileTemplate, /class="history-section"/);
  assert.match(profileTemplate, /过往练习/);
  assert.match(profileTemplate, /累计约 \{\{historicalHours\}\} 小时/);
  assert.match(profileTemplate, /bindinput="onHistoricalDaysInput"/);
  assert.match(profileTemplate, /bindinput="onHistoricalAvgMinutesInput"/);
  assert.doesNotMatch(profileTemplate, /class="history-input"[^>]*disabled/);
  assert.match(profileSource, /dataRepository\.getProfile\(\)/);
  assert.match(profileSource, /dataRepository\.saveProfile/);
  assert.match(profileSource, /historicalMinutes = historicalDays \* Math\.max/);
  assert.match(profileSource, /totalDays = activeRecords\.length \+ historicalDays/);
  assert.match(profileSource, /async saveProfileSettings\(\)/);
  assert.match(localProfileSource, /PROFILE_KEY = 'weapp_guest_profile_v1'/);
  assert.match(localProfileSource, /historical_days/);
  assert.match(localProfileSource, /historical_avg_minutes/);
  assert.match(profileTemplate, /class="history-card"/);
  assert.match(profileTemplate, /天数/);
  assert.match(profileTemplate, /分钟\/次/);
  assert.match(profileTemplate, /bindtap="saveProfileSettings"[\s\S]*保存设置/);
});

test('我的页会员卡复刻网页版完整权益表和等宽入口', () => {
  for (const text of [
    '每条记录照片',
    '单张照片大小',
    '练习选项',
    '日历标注',
    '日历颜色',
    '唱诵倒计时',
    '11 个',
    '自定义'
  ]) {
    assert.match(profileSource + profileTemplate, new RegExp(text));
  }
  assert.match(profileTemplate, /wx:for="\{\{proBenefits\}\}"/);
  assert.match(profileTemplate, /membership-head-action[\s\S]*bindtap="openMembershipShell"/);
  assert.match(profileStyles, /\.membership-head-action[\s\S]*background: linear-gradient/);
  assert.match(profileSource, /membershipService\.getMembershipStatus\(\)/);
  assert.match(profileSource, /membership\.is_active/);
  assert.match(profileTemplate, /有效期至 \{\{membershipExpiresAt\}\}/);
  assert.match(profileTemplate, /还剩 \{\{membershipDaysRemaining\}\} 天/);
  assert.match(profileTemplate, /membershipType === 'trial' \? ' · 试用会员'/);
  assert.match(profileTemplate, /\{\{isPro \? '续费' : '开通'\}\}/);
});

test('唱诵设置和自定义练习按钮按网页版真源复刻', () => {
  const practiceStyles = fs.readFileSync(path.join(__dirname, '../pages/practice/practice.wxss'), 'utf8');
  assert.match(practiceTemplate, /唱诵设置/);
  assert.match(practiceTemplate, /class="chant-number-input"/);
  assert.match(practiceTemplate, /data-field="minutes" data-delta="1"/);
  assert.match(practiceTemplate, /升级 Pro 解锁自定义时长/);
  assert.doesNotMatch(practiceTemplate, /唱诵延迟设置|保存延迟时间/);
  assert.match(practiceTemplate, /class="completion-save green-gradient[^\n]*"[\s\S]*添加选项/);
  assert.doesNotMatch(practiceTemplate, /保存练习类型/);
  assert.match(practiceStyles, /\.chant-settings-sheet/);
  assert.match(practiceStyles, /\.chant-number-input/);
  assert.match(practiceStyles, /\.chant-upgrade-button/);
});

test('时光轴按网页真源显示单张大图和三列多图，不再只取第一张', () => {
  const journalTemplate = fs.readFileSync(path.join(__dirname, '../pages/journal/journal.wxml'), 'utf8');
  const journalStyles = fs.readFileSync(path.join(__dirname, '../pages/journal/journal.wxss'), 'utf8');
  assert.match(journalTemplate, /wx:for="\{\{item\.photoItems\}\}"/);
  assert.match(journalTemplate, /item\.photos\.length === 1 \? 'widthFix' : 'aspectFill'/);
  assert.doesNotMatch(journalTemplate, /src="\{\{item\.photos\[0\]\}\}"/);
  assert.match(journalStyles, /\.timeline-photos\.single[\s\S]*width: 90%/);
  assert.match(journalStyles, /\.timeline-photos\.multiple[\s\S]*grid-template-columns: repeat\(3/);
});

test('照片后台上传在时光轴逐张显示等待、上传中、成功和失败状态', () => {
  const journalTemplate = fs.readFileSync(path.join(__dirname, '../pages/journal/journal.wxml'), 'utf8');
  const journalStyles = fs.readFileSync(path.join(__dirname, '../pages/journal/journal.wxss'), 'utf8');
  const repositorySource = fs.readFileSync(path.join(__dirname, '../services/data-repository.js'), 'utf8');
  assert.match(journalSource, /photoItems: photos\.map/);
  assert.match(journalSource, /dataRepository\.getPhotoSyncStatus\(record\.id, src\)/);
  assert.match(journalSource, /getPhotoSyncSnapshot\(records\)/);
  assert.match(journalSource, /nextSnapshot === this\.photoSyncSnapshot/);
  assert.match(journalSource, /setInterval\(\(\) => \{[\s\S]*refreshPhotoSyncItems\(\)[\s\S]*600/);
  assert.doesNotMatch(
    journalSource,
    /startPhotoSyncRefresh\(\)[\s\S]*setInterval\(\(\) => \{[\s\S]*renderCachedCalendar\(\)[\s\S]*600/
  );
  assert.match(journalTemplate, /等待上传/);
  assert.match(journalTemplate, /上传中/);
  assert.match(journalTemplate, /上传失败/);
  assert.match(journalStyles, /timeline-photo-sync-overlay/);
  assert.match(journalStyles, /@keyframes timeline-photo-spin/);
  assert.match(repositorySource, /function getPhotoSyncStatus\(recordId, path\)/);
  assert.match(repositorySource, /operation && operation\.last_error/);
});

test('照片后台同步不再阻塞日历和练习记录读取', () => {
  const repositorySource = fs.readFileSync(path.join(__dirname, '../services/data-repository.js'), 'utf8');
  assert.match(repositorySource, /options\.includePhotos[\s\S]*operation\.entity !== 'photo'/);
  assert.match(repositorySource, /!options\.includePhotos && accountSyncIncludesPhotos/);
  assert.match(repositorySource, /function syncPhotosInBackground\(\)/);
  assert.match(journalSource, /runBackgroundAccountSync\(\)/);
  assert.match(journalSource, /this\.setData\(\{ syncing: true, syncStatus: 'syncing'/);
  assert.match(journalSource, /syncPendingRecords\(\{ includePhotos: true \}\)/);
  assert.match(profileSource, /syncPendingRecords\(\{ includePhotos: true \}\)/);
});

test('完成练习保存后保持表单遮罩并直接切到觉察日记', () => {
  assert.match(practiceSource, /wx\.switchTab\(\{[\s\S]*url: '\/pages\/journal\/journal'/);
  assert.match(practiceSource, /success: \(\) => \{[\s\S]*showCompletion: false/);
  assert.doesNotMatch(practiceSource, /setTimeout\(\(\) => \{\s*wx\.switchTab\(\{ url: '\/pages\/journal\/journal' \}\);/);
});

test('日历先渲染本地缓存再在后台刷新且标注只合并读取一次', () => {
  const repositorySource = fs.readFileSync(path.join(__dirname, '../services/data-repository.js'), 'utf8');
  assert.match(journalSource, /onShow\(\)[\s\S]*this\.renderCachedCalendar\(\);[\s\S]*this\.loadPage\(\)/);
  assert.match(journalSource, /getCachedRecordsByDateRange\(startDate, endDate\)/);
  assert.match(journalSource, /loadCalendar\(\{ preserveExisting: true \}\)/);
  assert.match(journalSource, /Promise\.all\(\[[\s\S]*getRecordsByDateRange[\s\S]*getAnnotationTypes[\s\S]*getMonthAssignments/);
  assert.match(repositorySource, /function getCachedRecordsByDateRange\(startDate, endDate\)/);
});

test('照片大小读取优先使用文件系统 stat 而不是已废弃 wx.getFileInfo', () => {
  const photoStorageSource = fs.readFileSync(path.join(__dirname, '../services/photo-storage.js'), 'utf8');
  const statIndex = photoStorageSource.indexOf("typeof fs.stat === 'function'");
  const legacyIndex = photoStorageSource.indexOf('if (wx.getFileInfo)');
  assert.ok(statIndex >= 0 && legacyIndex > statIndex);
});

test('注册后把游客教程保留为账号本机记录且不计入我的页统计', () => {
  const repositorySource = fs.readFileSync(path.join(__dirname, '../services/data-repository.js'), 'utf8');
  const workspaceSource = fs.readFileSync(path.join(__dirname, '../services/account-workspace.js'), 'utf8');
  const authModalSource = fs.readFileSync(path.join(__dirname, '../components/auth-modal/index.js'), 'utf8');
  assert.match(repositorySource, /ensureAccountTutorialFromGuest/);
  assert.match(repositorySource, /current\.is_tutorial[\s\S]*updateLocalOnlyRecord/);
  assert.match(workspaceSource, /tutorialInRange/);
  assert.match(authModalSource, /if \(isRegister\) dataRepository\.ensureAccountTutorialFromGuest\(\)/);
  assert.match(profileSource, /!record\.is_tutorial && getRecordSeconds\(record\) > 0/);
});
