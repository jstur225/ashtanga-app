const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  userAgreement,
  privacyPolicy
} = require('../content/agreements');

const indexJs = fs.readFileSync(
  path.join(__dirname, '../pages/index/index.js'),
  'utf8'
);
const indexWxml = fs.readFileSync(
  path.join(__dirname, '../pages/index/index.wxml'),
  'utf8'
);

test('用户协议和隐私政策均提供完整章节', () => {
  assert.equal(userAgreement.title, '用户协议');
  assert.equal(privacyPolicy.title, '隐私政策');
  assert.ok(userAgreement.sections.length >= 8);
  assert.ok(privacyPolicy.sections.length >= 9);
  assert.match(JSON.stringify(userAgreement), /广州市番禺区车棚与四月信息技术部（个体工商户）/);
  assert.match(JSON.stringify(privacyPolicy), /广州市番禺区车棚与四月信息技术部（个体工商户）/);
  assert.match(JSON.stringify(userAgreement), /519216978@qq\.com/);
  assert.match(JSON.stringify(privacyPolicy), /519216978@qq\.com/);
});

test('会员条款与小程序支付路线一致且不再保留激活码口径', () => {
  const agreementText = JSON.stringify(userAgreement);
  assert.match(agreementText, /一次性购买的期限会员/);
  assert.match(agreementText, /不会自动续费/);
  assert.match(agreementText, /支付成功后系统将自动开通会员/);
  assert.match(agreementText, /新购买时长从原到期日顺延/);
  assert.doesNotMatch(agreementText, /激活码/);
});

test('隐私政策披露微信支付所需信息且不声称读取银行卡信息', () => {
  const privacyText = JSON.stringify(privacyPolicy);
  assert.match(privacyText, /微信小程序 openid/);
  assert.match(privacyText, /商户订单号/);
  assert.match(privacyText, /微信支付订单号/);
  assert.match(privacyText, /不会取得或保存您的银行卡号、支付密码/);
});

test('与用户有重大利害关系的条款使用重要提示标识', () => {
  const importantTerms = userAgreement.sections.filter((section) => section.important);
  assert.ok(importantTerms.length >= 4);
  assert.match(indexWxml, /agreement-important-label/);
});

test('登录和获取注册验证码前均强制检查协议同意', () => {
  const guardCalls = indexJs.match(/if \(!this\.ensureAgreement\(\)\)/g) || [];
  assert.equal(guardCalls.length, 2);
  assert.match(indexJs, /hasAgreed: false/);
  assert.match(indexWxml, /disabled="\{\{submitLoading \|\| !hasAgreed\}\}"/);
});

test('登录入口包含登录、注册、忘记密码和账号模式切换闭环', () => {
  assert.match(indexWxml, /登录已有账号/);
  assert.match(indexWxml, /创建熬汤日记账号/);
  assert.match(indexWxml, /忘记密码？/);
  assert.match(indexWxml, /forgotStep === 'email'/);
  assert.match(indexWxml, /forgotStep === 'verify'/);
  assert.match(indexWxml, /确认新密码/);
  assert.match(indexWxml, /auth-mail\.svg/);
  assert.match(indexWxml, /auth-lock\.svg/);
  assert.match(indexJs, /auth\.sendResetCode/);
  assert.match(indexJs, /auth\.verifyResetCode/);
  assert.match(indexJs, /auth\.resetPassword/);
  assert.match(indexJs, /wx\.setStorageSync\('weapp_account_mode_enabled', true\)/);
  assert.match(indexJs, /globalData\.dataMode = 'cloud'/);
});

test('注册密码规则与页面文案一致，要求八位、字母和数字', () => {
  assert.match(indexJs, /password\.length < 8/);
  assert.match(indexJs, /!\/\[a-zA-Z\]\//);
  assert.match(indexJs, /!\/\\d\//);
  assert.match(indexWxml, /passwordLengthValid/);
  assert.match(indexWxml, /passwordLetterValid/);
  assert.match(indexWxml, /passwordNumberValid/);
});

test('协议入口包含双协议链接和可滚动弹窗', () => {
  assert.match(indexWxml, /《用户协议》/);
  assert.match(indexWxml, /《隐私政策》/);
  assert.match(indexWxml, /<scroll-view[\s\S]*scroll-y/);
  assert.match(indexWxml, /wx:for="\{\{agreement\.sections\}\}"/);
  assert.match(indexWxml, /我已阅读，返回勾选/);
});

test('协议不再作未经确认的境内存储和定期备份承诺', () => {
  const privacyText = JSON.stringify(privacyPolicy);
  assert.doesNotMatch(privacyText, /服务器位于中国境内/);
  assert.doesNotMatch(privacyText, /定期备份/);
  assert.match(privacyText, /南亚地区（印度孟买）的服务器（境外）/);
  assert.match(privacyText, /单独同意/);
});

test('隐私政策已按 Supabase 孟买境外存储写明跨境告知与单独同意', () => {
  const privacy = JSON.stringify(privacyPolicy);
  assert.match(privacy, /南亚地区（印度孟买）/);
  assert.match(privacy, /涉及向境外提供个人信息/);
  assert.match(privacy, /取得您的单独同意/);
  assert.match(privacy, /阿里云 OSS 存储于中国大陆（上海）区域/);
  assert.match(privacy, /2026 年 8 月 13 日/);
});