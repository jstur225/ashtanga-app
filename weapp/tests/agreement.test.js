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
  assert.match(JSON.stringify(userAgreement), /微信小程序登记的个人开发者/);
  assert.match(JSON.stringify(userAgreement), /519216978@qq\.com/);
  assert.match(JSON.stringify(privacyPolicy), /519216978@qq\.com/);
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
  assert.match(privacyText, /核实 Supabase 项目的实际部署地域/);
  assert.match(privacyText, /单独同意/);
});
