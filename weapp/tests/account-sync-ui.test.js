const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const profileJs = fs.readFileSync(path.join(__dirname, '../pages/profile/profile.js'), 'utf8');
const profileWxml = fs.readFileSync(path.join(__dirname, '../pages/profile/profile.wxml'), 'utf8');
const profileWxss = fs.readFileSync(path.join(__dirname, '../pages/profile/profile.wxss'), 'utf8');
const profileJson = fs.readFileSync(path.join(__dirname, '../pages/profile/profile.json'), 'utf8');
const guestPanelWxml = fs.readFileSync(path.join(__dirname, '../components/account-guest-panel/index.wxml'), 'utf8');
const guestPanelWxss = fs.readFileSync(path.join(__dirname, '../components/account-guest-panel/index.wxss'), 'utf8');
const authWxml = fs.readFileSync(path.join(__dirname, '../components/auth-modal/index.wxml'), 'utf8');
const authJs = fs.readFileSync(path.join(__dirname, '../components/auth-modal/index.js'), 'utf8');
const authWxss = fs.readFileSync(path.join(__dirname, '../components/auth-modal/index.wxss'), 'utf8');
const changePasswordWxml = fs.readFileSync(path.join(__dirname, '../components/change-password-modal/index.wxml'), 'utf8');
const changePasswordJs = fs.readFileSync(path.join(__dirname, '../components/change-password-modal/index.js'), 'utf8');
const changePasswordWxss = fs.readFileSync(path.join(__dirname, '../components/change-password-modal/index.wxss'), 'utf8');

test('账户同步未登录状态复刻网页版本地存储风险提示与三入口', () => {
  for (const text of [
    '当前数据仅保存在本机',
    '如删除小程序或清除本地缓存',
    '数据仅供您个人跨设备访问',
    '未开启云同步',
    '去绑定邮箱',
    '继续使用本地存储',
    '已有账号？',
    '点击登录'
  ]) {
    assert.match(guestPanelWxml, new RegExp(text));
  }
  assert.match(guestPanelWxml, /account-lock\.svg/);
  assert.match(guestPanelWxml, /account-mail-white\.svg/);
  assert.match(guestPanelWxml, /account-smartphone\.svg/);
  assert.match(guestPanelWxss, /\.local-storage-notice[\s\S]*linear-gradient/);
  assert.match(profileWxml, /<account-guest-panel/);
  assert.doesNotMatch(profileWxml, /<button class="green-button account-main-button"/);
});

test('设置账户入口与 Tab Two 复用同一个 auth-modal', () => {
  assert.match(profileJson, /components\/auth-modal\/index/);
  assert.match(profileJson, /components\/account-guest-panel\/index/);
  assert.match(profileWxml, /<auth-modal[\s\S]*bind:success="onAuthSuccess"/);
  assert.match(profileWxml, /<account-guest-panel bind:auth="openLogin"/);
  assert.doesNotMatch(profileJs, /reLaunch\(\{ url: '\/pages\/index\/index\?account=1'/);
});

test('公共认证表单所有主按钮使用同一个显式渐变样式', () => {
  const buttons = authWxml.match(/class="full-submit auth-primary-button/g) || [];
  assert.equal(buttons.length, 6);
  assert.equal((authWxml.match(/style="\{\{primaryButtonStyle\}\}"/g) || []).length, 6);
  assert.match(authJs, /primaryButtonStyle: 'background-image:linear-gradient\(to top left,rgba\(74,122,68,\.7\),rgba\(45,90,39,\.85\)\);'/);
  assert.doesNotMatch(authJs, /primaryButtonStyle: '[^']*background-color/);
  assert.match(guestPanelWxss, /\.account-primary\{background-image:linear-gradient\(to top left,rgba\(74,122,68,\.7\),rgba\(45,90,39,\.85\)\)/);
  assert.doesNotMatch(guestPanelWxss, /\.account-primary\{[^}]*background-color/);
  assert.doesNotMatch(authWxml, /full-submit green-gradient/);
});

test('登录使用原生 form 的瞬时输入值，避免 Android setData 状态滞后', () => {
  assert.match(authWxml, /<form class="auth-form-stack" bindsubmit="submitAuth">/);
  assert.match(authWxml, /name="email"[\s\S]*name="password"/);
  assert.match(authWxml, /form-type="submit"/);
  assert.match(authJs, /resolveSubmittedLoginCredentials\(event, this\.data\)/);
  assert.match(authJs, /inputSource: credentials\.source/);
  assert.match(authWxml, /login-submit-group[\s\S]*login-submit-button[\s\S]*login-agreement-row/);
  assert.match(authWxss, /\.login-submit-group\{[^}]*gap:20rpx[^}]*width:100%/);
  assert.match(authWxss, /\.login-submit-button\{[^}]*margin:0!important/);
});

test('公共登录表单只保留密码登录和忘记密码', () => {
  assert.match(authWxml, /bindtap="openForgotPassword">忘记密码？/);
  assert.doesNotMatch(authWxml, /验证码登录|code-login|sendLoginCode|verifyLoginCode/);
  assert.doesNotMatch(authJs, /openCodeLogin|sendLoginCode|verifyLoginCode|signInWithCode/);
});

test('账户同步已登录状态复刻网页版邮箱、云同步状态和操作按钮', () => {
  for (const text of [
    '已绑定邮箱',
    '云端同步已开启',
    '换设备或重装小程序',
    '支持多设备登录',
    'lastSyncText',
    '项数据待同步',
    '立即同步',
    '退出登录',
    '修改密码'
  ]) {
    assert.match(profileWxml, new RegExp(text));
  }
  for (const icon of ['account-check-circle', 'account-cloud', 'account-refresh', 'account-logout', 'account-key']) {
    assert.match(profileWxml, new RegExp(`${icon}\\.svg`));
  }
  assert.match(profileWxml, /wx:if="\{\{!isAccountMode\}\}"/);
  assert.match(profileJs, /isAccountMode: dataRepository\.getMode\(\) === 'cloud'/);
  assert.match(profileJs, /dataRepository\.syncPendingRecords\(\{ includePhotos: true \}\)/);
  assert.match(profileWxml, /bindtap="syncAccountRecords"/);
  assert.match(profileWxml, /bindtap="resetSyncStatus"/);
  assert.doesNotMatch(profileWxml, /data-label="同步卡住重置" bindtap="placeholderAction"/);
});

test('退出选项包含仅退出和退出并清空，后者进入三阶段清空流程', () => {
  assert.match(profileWxml, /仅退出登录/);
  assert.match(profileWxml, /退出并清空数据/);
  assert.match(profileWxml, /bindtap="openLogoutAndClear"/);
  assert.match(profileJs, /clearDataAlsoLogout: true/);
  assert.match(profileJs, /const shouldLogout = Boolean\(this\.data\.clearDataAlsoLogout\)/);
});

test('账户同步登录态沿用网页提醒卡与按钮布局，旋转的是刷新图标本身', () => {
  assert.doesNotMatch(profileWxml, /bindtap="syncAccountRecords"[^>]*loading=/);
  assert.match(profileWxml, /account-sync-icon \{\{syncStatus === 'syncing' \? 'is-spinning' : ''\}\}/);
  assert.match(profileWxss, /\.account-sync-icon\.is-spinning\s*\{[\s\S]*animation: account-sync-icon-spin/);
  assert.match(profileWxss, /\.cloud-storage-notice\s*\{[\s\S]*rgba\(255, 251, 235, 0\.8\)[\s\S]*rgba\(253, 230, 138, 0\.5\)/);
  assert.match(profileWxml, /<view class="account-action-row">[\s\S]*bindtap="syncAccountRecords"[\s\S]*bindtap="openLogoutShell"[\s\S]*<\/view>[\s\S]*account-password-button/);
});

test('头像上传和修改密码不再是占位功能，并复刻网页版表单结构', () => {
  assert.match(profileWxml, /bindtap="chooseAvatar"/);
  assert.match(profileWxml, /profile-edit-avatar-image/);
  assert.match(profileWxml, /uploadingAvatar/);
  assert.match(profileJs, /photoStorage\.uploadAvatar/);
  assert.match(profileJs, /dataRepository\.saveProfile/);
  assert.match(profileWxml, /<change-password-modal/);
  assert.match(changePasswordWxml, /bindinput="onCurrentPasswordInput"/);
  assert.match(changePasswordWxml, /bindinput="onNewPasswordInput"/);
  assert.match(changePasswordWxml, /bindinput="onConfirmPasswordInput"/);
  assert.match(changePasswordWxml, /bindtap="submitPasswordChange"/);
  assert.match(changePasswordWxml, /密码要求/);
  assert.match(changePasswordJs, /auth\.changePassword/);
  assert.doesNotMatch(profileWxml, /data-label="确认修改密码" bindtap="placeholderAction"/);
  assert.match(changePasswordWxss, /\.password-actions[\s\S]*grid-template-columns:1fr 1fr/);
});

test('注册验证码发送前校验密码，修改密码分别提示缺少字母或数字', () => {
  assert.match(authJs, /async sendCode\(\)[\s\S]*this\.validatePassword\(this\.data\.password\)[\s\S]*auth\.sendRegisterCode/);
  assert.match(changePasswordJs, /!\/\[a-zA-Z\]\/[\s\S]*密码必须包含字母/);
  assert.match(changePasswordJs, /!\/\\d\/[\s\S]*密码必须包含数字/);
});

test('忘记密码返回登录后保留真实冷却截止时间并显示剩余秒数', () => {
  assert.match(authJs, /countdownDeadline = Date\.now\(\)/);
  assert.match(authJs, /resumeCountdown\(\)/);
  assert.match(authJs, /请等待 \$\{this\.data\.resendCountdown\} 秒后重新发送/);
  assert.match(authWxml, /重新发送（.*resendCountdown.*s）/);
  assert.doesNotMatch(authJs, /backToLogin\(\) \{\s*this\.clearCountdown/);
});
