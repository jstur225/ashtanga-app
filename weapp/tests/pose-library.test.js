const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const posePackage = path.join(root, 'pose-package');
const poseSource = fs.readFileSync(path.join(posePackage, 'pages/poses/poses.js'), 'utf8');
const poseTemplate = fs.readFileSync(path.join(posePackage, 'pages/poses/poses.wxml'), 'utf8');
const poseStyles = fs.readFileSync(path.join(posePackage, 'pages/poses/poses.wxss'), 'utf8');
const { POSE_SECTIONS, POSES } = require(path.join(posePackage, 'services/pose-data.js'));

test('体式库完整同步网页版五个分类与 94 张卡片', () => {
  assert.deepEqual(POSE_SECTIONS.map((item) => item.name), [
    '拜日 A',
    '拜日 B',
    '站立体式',
    '坐立体式',
    '结束体式'
  ]);
  assert.equal(POSES.length, 94);
  assert.deepEqual(
    POSE_SECTIONS.map((section) => POSES.filter((pose) => pose.section === section.id).length),
    [11, 19, 18, 33, 13]
  );
});

test('体式图片全部来自可提交审核的小程序分包本地资源', () => {
  for (const pose of POSES) {
    assert.match(pose.image, /^\.\.\/\.\.\/images\/.+\.png$/);
    assert.ok(fs.existsSync(path.resolve(posePackage, 'pages/poses', pose.image)), pose.image);
  }
  assert.equal(new Set(POSES.map((pose) => pose.image)).size, 94);
  const localImages = fs.readdirSync(path.join(posePackage, 'images'), { recursive: true })
    .filter((item) => /\.(?:png|jpe?g|webp)$/i.test(String(item)));
  assert.equal(localImages.filter((item) => /\.png$/i.test(String(item))).length, 94);
  assert.equal(localImages.filter((item) => /\.jpe?g$/i.test(String(item))).length, 0);
  assert.equal(localImages.filter((item) => /\.webp$/i.test(String(item))).length, 0);

  for (const pose of POSES) {
    const bytes = fs.readFileSync(path.resolve(posePackage, 'pages/poses', pose.image));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.notEqual(bytes.indexOf(Buffer.from('tRNS')), -1, `${pose.image} should preserve transparency`);
  }
});

test('列表 UI 复刻网页版分类胶囊、三列正方形卡片且不添加搜索', () => {
  assert.match(poseTemplate, /class="section-pill \{\{activeSection === item\.id/);
  assert.match(poseTemplate, /class="pose-grid"/);
  assert.match(poseTemplate, /mode="aspectFit" lazy-load/);
  assert.doesNotMatch(poseTemplate, /搜索|search/i);
  assert.match(poseStyles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(poseStyles, /\.pose-image-shell[\s\S]*aspect-ratio: 1/);
  assert.match(poseStyles, /\.section-pill\.active[\s\S]*background: #5B7553/);
  assert.match(poseStyles, /\.pose-tab-pill[\s\S]*backdrop-filter: blur\(16rpx\)[\s\S]*background: rgba\(255, 255, 255, 0\.88\)/);
});

test('详情复刻图片、梵文主标题、中文副标题、Vinyasa 分解与前后切换', () => {
  assert.match(poseTemplate, /\{\{selectedPose\.name\}\}/);
  assert.match(poseTemplate, /\{\{selectedPose\.cueName\}\}/);
  assert.match(poseTemplate, /VINYASA 总数/);
  assert.match(poseTemplate, /VINYASA 分解/);
  assert.match(poseTemplate, /绿色为体位法位置/);
  assert.match(poseTemplate, /data-direction="prev" bindtap="navigatePose"/);
  assert.match(poseTemplate, /data-direction="next" bindtap="navigatePose"/);
  assert.match(poseTemplate, /体式库以动作解析为主/);
  assert.match(poseSource, /\(this\.data\.poseIndex - 1 \+ count\) % count/);
  assert.match(poseSource, /\(this\.data\.poseIndex \+ 1\) % count/);
});

test('体式分包内的悬浮导航保持四栏，并在详情打开时隐藏', () => {
  assert.match(poseTemplate, /wx:if="\{\{!selectedPose\}\}" class="pose-tab-shell"/);
  assert.match(poseSource, /text: '今日练习'[\s\S]*text: '觉察日记'[\s\S]*text: '体式库'[\s\S]*text: '我的数据'/);
  assert.match(poseStyles, /\.pose-tab-pill[\s\S]*max-width: 650rpx/);
});
