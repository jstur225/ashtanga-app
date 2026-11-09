const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const appConfig = JSON.parse(read('app.json'));
const ordersSource = read('pages/orders/orders.js');
const ordersTemplate = read('pages/orders/orders.wxml');
const ordersStyle = read('pages/orders/orders.wxss');
const profileSource = read('pages/profile/profile.js');

test('订单中心页已注册到 app.json', () => {
  assert.ok(appConfig.pages.includes('pages/orders/orders'), 'pages/orders/orders 应在 app.json pages 中');
});

test('订单中心页引用支付服务并具备完整页面能力', () => {
  assert.match(ordersSource, /require\('..\/..\/services\/payment'\)/);
  assert.match(ordersSource, /paymentService\.getOrders\(\)/);
  assert.match(ordersSource, /paymentService\.queryOrderStatus\(/);
  assert.match(ordersSource, /onPullDownRefresh/);
  assert.match(ordersSource, /presentPaymentOrder/);
});

test('订单卡片模板包含状态/金额/订单号/刷新入口', () => {
  assert.match(ordersTemplate, /item\.statusLabel/);
  assert.match(ordersTemplate, /item\.amountText/);
  assert.match(ordersTemplate, /item\.out_trade_no/);
  assert.match(ordersTemplate, /bindtap="refreshOrder"/);
  assert.match(ordersTemplate, /item\.isSandbox/);
});

test('我的页订单记录入口跳转到订单中心', () => {
  assert.match(profileSource, /wx\.navigateTo\(\{ url: '\/pages\/orders\/orders' \}\)/);
});

test('订单中心样式文件存在且包含订单卡片基础样式', () => {
  assert.match(ordersStyle, /\.order-card\s*\{/);
  assert.match(ordersStyle, /\.order-status\.paid/);
  assert.match(ordersStyle, /\.order-refresh-button/);
});
