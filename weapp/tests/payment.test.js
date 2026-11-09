const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const weappRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(weappRoot, '..');
const read = (file) => fs.readFileSync(path.join(projectRoot, file), 'utf8');
const paymentSource = read('weapp/services/payment.js');
const profileSource = read('weapp/pages/profile/profile.js');
const profileTemplate = read('weapp/pages/profile/profile.wxml');
const virtualPay = read('lib/wechat-virtual-pay.ts');
const paymentServer = read('lib/payment-server.ts');
const createRoute = read('app/api/membership/order/create/route.ts');
const statusRoute = read('app/api/membership/order/status/route.ts');
const listRoute = read('app/api/membership/order/list/route.ts');
const healthRoute = read('app/api/membership/payment-health/route.ts');
const migration = read('supabase/migrations/20260811_migrate_payment_orders_to_virtual_pay.sql');

test('小程序使用微信虚拟支付道具直购，不再调用普通 requestPayment', () => {
  assert.match(paymentSource, /wx\.requestVirtualPayment\(/);
  assert.doesNotMatch(paymentSource, /wx\.requestPayment\(/);
  assert.match(paymentSource, /mode: params\.mode \|\| 'short_series_goods'/);
  assert.match(paymentSource, /typeof wx\.requestVirtualPayment !== 'function'/);
});

test('季度和年度道具、价格和支付环境均由服务端决定', () => {
  assert.match(virtualPay, /quarter: 'pro90d'/);
  assert.match(virtualPay, /year: 'pro365d'/);
  assert.match(virtualPay, /goodsPrice: plan\.amount_total/);
  assert.match(virtualPay, /offerId: config\.offerId/);
  assert.match(createRoute, /getPaymentPlan\(body\?\.plan\)/);
  assert.match(paymentSource, /data: \{ plan, code \}/);
  assert.doesNotMatch(paymentSource, /amount_total\s*:/);
});

test('支付签名由服务端 AppKey 和 wx.login session_key 分别计算', () => {
  assert.match(virtualPay, /requestVirtualPayment&\$\{signData\}/);
  assert.match(virtualPay, /hmacSha256Hex\(sessionKey, signData\)/);
  assert.match(paymentServer, /sessionKey: data\.session_key/);
  assert.match(createRoute, /const \{ openid, sessionKey \} = await exchangeLoginCode/);
  assert.match(createRoute, /buildVirtualPaymentParams\(/);
  assert.doesNotMatch(paymentSource, /WECHAT_VIRTUAL_PAY_.*APP_KEY/);
});

test('支付成功通过微信虚拟支付查单后幂等开通会员并通知发货', () => {
  assert.match(statusRoute, /queryVirtualPaymentOrder\(/);
  assert.match(statusRoute, /fulfillPaymentOrder\(/);
  assert.match(statusRoute, /notifyVirtualGoodsProvided\(/);
  assert.match(statusRoute, /amount !== order\.amount_total/);
  assert.match(paymentSource, /\/api\/membership\/order\/status/);
  assert.match(paymentSource, /membershipService\.getMembershipStatus\(\{ force: true \}\)/);
  assert.doesNotMatch(profileSource, /user_memberships/);
});

test('支付订单迁移保存 provider、product、openid、环境和发货确认时间', () => {
  for (const column of [
    'payment_provider',
    'product_id',
    'wechat_openid',
    'virtual_env',
    'virtual_provided_at'
  ]) {
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}`));
  }
  assert.match(migration, /wechat_virtual_pay/);
});

test('会员购买仍为一次性非自动续费并要求用户确认', () => {
  assert.match(profileTemplate, /purchase-plan-card/);
  assert.match(profileTemplate, /purchaseAgreementChecked/);
  assert.match(profileTemplate, /bindtap="startMembershipPurchase"/);
  assert.match(profileSource, /paymentService\.purchase/);
});

test('健康检查只验证当前虚拟支付环境所需配置', () => {
  assert.match(healthRoute, /getWechatVirtualPayConfig/);
  assert.match(healthRoute, /provider: 'wechat_virtual_pay'/);
  assert.match(healthRoute, /offer_id: config\.offerId/);
  assert.match(virtualPay, /WECHAT_VIRTUAL_PAY_SANDBOX_APP_KEY/);
  assert.match(virtualPay, /WECHAT_VIRTUAL_PAY_PRODUCTION_APP_KEY/);
});

test('支付订单会持久化，并在重新进入小程序或会员页时自动补查', () => {
  const appSource = read('weapp/app.js');
  assert.match(paymentSource, /ashtanga_pending_membership_orders_v1/);
  assert.match(paymentSource, /savePendingOrder\(order\.order_id, plan\)/);
  assert.match(paymentSource, /recoverPendingOrders/);
  assert.match(paymentSource, /getPendingOrdersForCurrentUser/);
  assert.match(appSource, /recoverPendingOrders\(\{[\s\S]*maxOrders: 1,[\s\S]*maxAgeMs: 30 \* 60 \* 1000/);
  assert.match(profileSource, /recoverPendingOrders\(\{ maxOrders: 1, maxAgeMs: 30 \* 60 \* 1000 \}\)/);
});

test('只有明确终态才清理待确认订单，结果未知和网络异常保留以便重试', () => {
  assert.match(paymentSource, /VIRTUAL_PAYMENT_RESULT_UNKNOWN/);
  assert.match(paymentSource, /\['failed', 'closed', 'refunded'\]\.includes\(data\.status\)/);
  assert.match(paymentSource, /result\.errors \+= 1/);
  assert.match(paymentSource, /removePendingOrder\(order\.order_id\)/);
  assert.match(paymentSource, /PENDING_ORDER_MAX_AGE = 7 \* 24 \* 60 \* 60 \* 1000/);
});

test('会员页提供当前账号订单记录，并允许待确认订单手动刷新', () => {
  const profileStyles = read('weapp/pages/profile/profile.wxss');
  assert.match(profileTemplate, /bindtap="openOrderShell"/);
  assert.match(profileTemplate, />订单记录</);
  assert.match(profileTemplate, /paymentOrders/);
  assert.match(profileTemplate, /bindtap="refreshPaymentOrder"/);
  assert.match(profileSource, /paymentService\.getOrders\(\)/);
  assert.match(profileSource, /paymentService\.queryOrderStatus\(orderId\)/);
  assert.match(profileTemplate, /\/images\/icons\/membership-order\.svg/);
  assert.match(profileStyles, /\.membership-order-card/);
  assert.match(profileStyles, /\.order-status\.paid/);
  assert.match(profileTemplate, /order-sandbox-badge/);
  assert.match(profileSource, /isSandbox: Number\(order\.virtual_env\) === 1/);
  assert.match(profileStyles, /\.order-refresh-button[\s\S]*align-items: center[\s\S]*justify-content: center/);
});

test('订单列表只由服务端按登录账号读取，不开放 payment_orders 客户端直查', () => {
  assert.match(listRoute, /authenticatePaymentRequest/);
  assert.match(listRoute, /listPaymentOrdersForUser\(supabase, user\.id, 20\)/);
  assert.match(paymentServer, /\.eq\('auth_user_id', authUserId\)/);
  assert.match(paymentServer, /\.order\('created_at', \{ ascending: false \}\)/);
  assert.match(paymentServer, /paid_at,virtual_env,created_at/);
  assert.match(paymentSource, /\/api\/membership\/order\/list/);
});

test('取消支付后自动回写“已关闭”，订单列表无需手动刷新', () => {
  assert.match(paymentSource, /payResult && payResult\.cancelled[\s\S]*removePendingOrder\(order\.order_id\)[\s\S]*queryOrderStatus\(order\.order_id\)\.catch\(\(\) => null\)/);
  assert.match(statusRoute, /if \(state !== 'pending'\)/);
  assert.match(statusRoute, /status: state/);
  assert.match(virtualPay, /if \(value === 6\) return 'closed'/);
  assert.match(profileSource, /closed: \{ label: '已关闭'/);
});