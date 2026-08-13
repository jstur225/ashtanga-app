const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const practiceSource = read('pages/practice/practice.js');
const practiceTemplate = read('pages/practice/practice.wxml');
const journalSource = read('pages/journal/journal.js');
const journalTemplate = read('pages/journal/journal.wxml');
const formSource = read('components/practice-record-form/index.js');
const formTemplate = read('components/practice-record-form/index.wxml');
const annotationSource = read('components/annotation-manager/index.js');
const annotationTemplate = read('components/annotation-manager/index.wxml');
const repositorySource = read('services/data-repository.js');
const profileTemplate = read('pages/profile/profile.wxml');
const profileSource = read('pages/profile/profile.js');
const profileStyle = read('pages/profile/profile.wxss');
const membershipPromptSource = read('components/membership-prompt/index.js');
const membershipPromptTemplate = read('components/membership-prompt/index.wxml');
const membershipPromptStyle = read('components/membership-prompt/index.wxss');

test('今日练习和公共记录表单统一读取会员能力', () => {
  assert.match(practiceSource, /membershipPolicy\.getCapabilities\(membership\)/);
  assert.match(practiceSource, /membershipLocked: !isPro && index >= capabilities\.maxPracticeOptions/);
  assert.match(practiceSource, /membershipPolicy\.isColorLevelAllowed/);
  assert.match(practiceSource, /membershipPolicy\.clampChantDelay/);
  assert.match(practiceTemplate, /wx:for="\{\{colorLevelOptions\}\}"/);
  assert.match(practiceTemplate, /max-photos="\{\{maxPhotos\}\}"/);
  assert.match(practiceTemplate, /photo-enabled="\{\{photoEnabled\}\}"/);
  assert.match(practiceTemplate, /升级 Pro 解锁自定义时长/);

  assert.match(formSource, /dataRepository\.uploadRecordPhotos/);
  assert.match(formSource, /Number\(this\.properties\.maxPhotos\)/);
  assert.match(formSource, /membershipPolicy\.isColorLevelAllowed/);
  assert.match(formTemplate, /item\.membershipLocked/);
  assert.match(formTemplate, /item\.locked \? 'membership-locked'/);
});

test('觉察日记和标注管理器共享 FREE\/PRO 上限', () => {
  assert.match(journalSource, /maxAnnotationTypes: capabilities\.maxAnnotationTypes/);
  assert.match(journalSource, /membershipLocked: !this\.data\.isPro/);
  assert.match(journalTemplate, /maxTypes="\{\{maxAnnotationTypes\}\}"/);
  assert.match(journalTemplate, /photo-enabled="\{\{dataMode === 'cloud'\}\}"/);
  assert.match(journalTemplate, /bind:membershipLimit="onMembershipLimit"/);
  assert.match(annotationSource, /membershipLocked: index >= maxTypes/);
  assert.match(annotationTemplate, /item\.membershipLocked/);
});

test('数据仓库不能绕过照片数量和免费色阶限制', () => {
  assert.match(repositorySource, /!cloudMode && inputPhotos\.length > 0/);
  assert.match(repositorySource, /!cloudMode && addedPhotos\.length > 0/);
  assert.match(repositorySource, /getReasonMessage\('photo_account'\)/);
  assert.match(repositorySource, /inputPhotos\.length > capabilities\.maxPhotosPerRecord/);
  assert.match(repositorySource, /persistPhotos\(inputPhotos, \{ isPro \}\)/);
  assert.match(repositorySource, /normalizeColorLevel\(input\.color_level, isPro\)/);
  assert.match(repositorySource, /normalizeColorLevel\(updates\.color_level, isPro\)/);
});

test('小程序会员入口不再提供激活码，支付完成后才自动开通', () => {
  assert.doesNotMatch(profileTemplate, /激活码/);
  assert.match(profileTemplate, /membership-head-action[\s\S]*membership-sparkles-white\.svg/);
});

test('所有会员限制复用网页版底部权益 Sheet，不再使用系统提示框', () => {
  assert.match(practiceTemplate, /<membership-prompt/);
  assert.match(journalTemplate, /<membership-prompt/);
  assert.match(practiceSource, /showMembershipPrompt: true/);
  assert.match(journalSource, /showMembershipPrompt: true/);
  assert.doesNotMatch(practiceSource, /showMembershipLimit\(reason\)[\s\S]{0,220}wx\.showModal/);
  assert.doesNotMatch(journalSource, /onMembershipLimit\(event\)[\s\S]{0,220}wx\.showModal/);
  assert.match(membershipPromptTemplate, /PRO 会员/);
  assert.match(membershipPromptSource, /每条记录照片/);
  assert.match(membershipPromptTemplate, /小程序支付后自动开通/);
  assert.match(membershipPromptStyle, /linear-gradient\(135deg, #C1A268, #D4AF37\)/);
  assert.doesNotMatch(membershipPromptTemplate, /激活码/);
});

test('限制触发原因覆盖六项权益，升级入口打开我的会员页', () => {
  for (const reason of ['options_full', 'locked_option', 'locked_annotation', 'color_level', 'photo_count', 'photo_size', 'chant_delay']) {
    assert.match(membershipPromptSource, new RegExp(`${reason}:`));
  }
  assert.match(practiceSource, /ashtanga_profile_settings_tab/);
  assert.match(journalSource, /ashtanga_profile_settings_tab/);
  assert.match(profileSource, /pendingSettingsTab/);
});

test('锁定态按网页真源使用锁图标而非 PRO 文字角标', () => {
  assert.match(practiceTemplate, /membership-lock\.svg/);
  assert.match(practiceTemplate, /membership-lock-white\.svg/);
  assert.match(annotationTemplate, /membership-lock\.svg/);
  assert.match(formTemplate, /membership-lock\.svg/);
  assert.match(formTemplate, /membership-lock-white\.svg/);
  assert.doesNotMatch(practiceTemplate, /class="option-pro-lock">PRO/);
  assert.doesNotMatch(annotationTemplate, /class="ann-pro-lock">PRO/);
});

test('会员卡片头部常驻开通/续费按钮，不滚动即可见', () => {
  assert.match(profileTemplate, /membership-head-action[\s\S]*bindtap="openMembershipShell"/);
  assert.match(profileTemplate, /membership-head-action-text[\s\S]*\{\{isPro \? '续费' : '开通'\}\}/);
  assert.match(profileStyle, /\.membership-head-action \{/);
  assert.match(profileStyle, /margin-left: auto/);
});