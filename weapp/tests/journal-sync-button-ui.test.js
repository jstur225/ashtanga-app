const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Tab Two sync button follows the Web cloud and status states', () => {
  const js = read('pages/journal/journal.js');
  const wxml = read('pages/journal/journal.wxml');
  const wxss = read('pages/journal/journal.wxss');

  assert.match(js, /syncStatus: 'idle'/);
  assert.match(js, /syncStatus: 'syncing'/);
  assert.match(js, /syncStatus: 'error'/);
  assert.match(js, /dataRepository\.syncPendingRecords\(\{ includePhotos: true \}\)/);
  assert.match(js, /completed \? 'success' : 'error'/);
  assert.match(js, /pendingSyncCount: result\.pending/);
  assert.match(wxml, /pendingSyncCount > 0/);
  assert.match(wxml, /dataMode === 'cloud' \? 'green-gradient' : 'sync-control-offline'/);
  assert.match(wxml, /sync-status-\{\{dataMode === 'guest' \? 'offline' : syncStatus\}\}/);
  assert.match(js, /journal-cloud\.png/);
  assert.match(wxss, /\.sync-status-offline[\s\S]*#F87171/);
  assert.match(wxss, /\.sync-status-syncing[\s\S]*#60A5FA/);
  assert.match(wxss, /\.sync-status-success[\s\S]*#4ADE80/);
});

test('Tab Two sync opens the Web account sheet and a real auth modal', () => {
  const js = read('pages/journal/journal.js');
  const wxml = read('pages/journal/journal.wxml');
  const pageJson = read('pages/journal/journal.json');
  const authJs = read('components/auth-modal/index.js');
  const authWxml = read('components/auth-modal/index.wxml');
  const authWxss = read('components/auth-modal/index.wxss');
  const guestWxml = read('components/account-guest-panel/index.wxml');

  assert.match(js, /if \(action === 'sync'\)[\s\S]*this\.openAccountSync\(\)/);
  assert.match(wxml, /showAccountSync/);
  assert.match(wxml, /<account-guest-panel/);
  assert.match(guestWxml, /当前数据仅保存在本机/);
  assert.match(guestWxml, /去绑定邮箱/);
  assert.match(guestWxml, /已有账号？/);
  assert.match(guestWxml, /account-button-stack/);
  assert.match(wxml, /<auth-modal[\s\S]*bind:success="onAuthSuccess"/);
  assert.match(pageJson, /components\/auth-modal\/index/);
  assert.match(pageJson, /components\/account-guest-panel\/index/);
  assert.match(authJs, /auth\.signInWithPassword/);
  assert.match(authJs, /auth\.registerWithEmail/);
  assert.match(authJs, /auth\.sendResetCode/);
  assert.match(authJs, /weapp_account_mode_enabled/);
  assert.match(authJs, /registerStep: 'form'/);
  assert.match(authJs, /registerStep: 'verify'/);
  assert.match(authWxml, /《用户协议》/);
  assert.match(authWxml, /《隐私政策》/);
  assert.match(authWxml, /submitLoading \|\| !hasAgreed \? 'action-disabled'/);
  assert.doesNotMatch(authWxml, /mode-tabs/);
  assert.match(authWxml, /registerStep === 'form'/);
  assert.match(authWxml, /发送验证码/);
  assert.match(authWxml, /确认并注册/);
  assert.match(authWxml, /忘记密码？/);
  assert.doesNotMatch(authWxml, />取消<\/button>/);
  assert.match(authWxss, /\.green-gradient\{background-image:linear-gradient/);
  assert.match(authWxss, /\.full-submit[\s\S]*min-width:100%[\s\S]*width:100%/);
  assert.match(authWxss, /\.full-submit[\s\S]*border-radius:48rpx/);
  assert.match(authWxss, /\.auth-input[\s\S]*border-radius:48rpx/);
  assert.match(authWxss, /\.auth-submit-text\{color:#FFFFFF/);
  assert.doesNotMatch(authWxss, /\.full-submit text|\.input-wrap image|text:last-child/);
  assert.match(authWxml, /<button class="full-submit[^>]*form-type="submit"[^>]*hover-class="none"/);
  assert.match(authWxss, /\.auth-primary-button::after\{border:0\}/);
  assert.match(authWxml, /full-submit auth-primary-button/);
});

test('Tab Two 登录态同步弹层与网页真源保持三个操作且只旋转刷新图标', () => {
  const js = read('pages/journal/journal.js');
  const wxml = read('pages/journal/journal.wxml');
  const wxss = read('pages/journal/journal.wxss');

  assert.match(wxml, /account-action-row[\s\S]*立即同步[\s\S]*退出登录/);
  assert.match(wxml, /account-password-button[\s\S]*修改密码/);
  assert.match(wxml, /account-sync-icon \{\{syncing \? 'is-spinning' : ''\}\}/);
  assert.doesNotMatch(wxml, /bindtap="runAccountSync"[^>]*loading=/);
  assert.match(wxss, /\.account-sync-icon\.is-spinning[\s\S]*account-sync-icon-spin/);
  assert.match(wxss, /\.calendar-control\.syncing \.toolbar-icon[\s\S]*infinite/);
  assert.match(js, /runBackgroundAccountSync\(\)[\s\S]*syncPendingRecords\(\{ includePhotos: true \}\)/);
  assert.match(js, /requestAccountLogout\(\)/);
  assert.match(js, /openPasswordFromSync\(\)[\s\S]*showPasswordShell: true/);
  assert.doesNotMatch(js, /openPasswordFromSync\(\)[\s\S]{0,160}authInitialMode: 'forgot-password'/);
  assert.match(wxml, /<change-password-modal[\s\S]*bind:success="onPasswordChanged"/);
});
