const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.resolve(__dirname, '../services/payment.js'),
  'utf8'
);

function loadPayment(options = {}) {
  const storage = options.storage || {};
  const session = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    user: { id: 'user-1' }
  };
  let membershipRefreshes = 0;

  const wx = {
    getStorageSync(key) { return storage[key]; },
    setStorageSync(key, value) { storage[key] = value; },
    removeStorageSync(key) { delete storage[key]; },
    login({ success }) { success({ code: 'wx-code' }); },
    requestVirtualPayment(params) {
      if (options.cancelPayment) {
        params.fail({ errCode: -2, errMsg: 'requestVirtualPayment:fail cancel' });
      } else {
        params.success({ errMsg: 'requestVirtualPayment:ok' });
      }
    }
  };

  const auth = {
    getStoredSession() { return session; },
    async getValidSession() { return session; },
    isRecoverableSessionError() { return false; },
    async refreshSession() { return session; }
  };
  const membership = {
    async getMembershipStatus() {
      membershipRefreshes += 1;
      return { is_active: true, days_remaining: 90 };
    }
  };
  const runtimeErrors = {
    startTrace(category, name) { return { category, name, started_at: Date.now() }; },
    finishTrace() {},
    recordEvent() {}
  };
  const appApiRequest = async (requestPath, requestOptions) => {
    if (typeof options.api === 'function') {
      return options.api(requestPath, requestOptions);
    }
    throw new Error(`unexpected request: ${requestPath}`);
  };

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    wx,
    console,
    Promise,
    Date,
    setTimeout,
    clearTimeout,
    require(request) {
      if (request === './auth') return auth;
      if (request === './membership') return membership;
      if (request === './runtime-errors') return runtimeErrors;
      if (request === '../utils/request') return { appApiRequest };
      throw new Error(`unexpected require: ${request}`);
    }
  };
  vm.runInNewContext(`(function (require, module, exports) { ${source}\n})(require, module, exports);`, sandbox);
  return {
    payment: module.exports,
    storage,
    membershipRefreshes: () => membershipRefreshes
  };
}

function createdOrder(orderId = 'order-1') {
  return {
    success: true,
    data: {
      order_id: orderId,
      signData: 'sign-data',
      paySig: 'pay-sig',
      signature: 'user-signature',
      mode: 'short_series_goods'
    }
  };
}

test('创建订单后立即持久化，重新启动查到已支付后清理并刷新会员', async () => {
  let status = 'pending';
  const runtime = loadPayment({
    api(requestPath) {
      if (requestPath === '/api/membership/order/create') return createdOrder();
      if (requestPath.includes('/api/membership/order/status')) {
        return { success: true, data: { status, order_id: 'order-1' } };
      }
      throw new Error(`unexpected request: ${requestPath}`);
    }
  });

  await runtime.payment.purchase('quarter', { skipPoll: true });
  assert.equal(runtime.payment.getPendingOrdersForCurrentUser().length, 1);

  status = 'paid';
  const result = await runtime.payment.recoverPendingOrders();
  assert.equal(result.recovered, 1);
  assert.equal(runtime.payment.getPendingOrdersForCurrentUser().length, 0);
  assert.equal(runtime.membershipRefreshes(), 2);
});

test('用户明确取消支付时删除本地待确认订单', async () => {
  const runtime = loadPayment({
    cancelPayment: true,
    api(requestPath) {
      if (requestPath === '/api/membership/order/create') return createdOrder('cancelled-order');
      throw new Error(`unexpected request: ${requestPath}`);
    }
  });

  const result = await runtime.payment.purchase('year');
  assert.equal(result.cancelled, true);
  assert.equal(runtime.payment.getPendingOrdersForCurrentUser().length, 0);
});

test('自动补查遇到网络错误时保留订单供下次重试', async () => {
  let recovering = false;
  const runtime = loadPayment({
    api(requestPath) {
      if (requestPath === '/api/membership/order/create') return createdOrder('retry-order');
      if (requestPath.includes('/api/membership/order/status') && recovering) {
        throw new Error('network unavailable');
      }
      throw new Error(`unexpected request: ${requestPath}`);
    }
  });

  await runtime.payment.purchase('quarter', { skipPoll: true });
  recovering = true;
  const result = await runtime.payment.recoverPendingOrders();
  assert.equal(result.errors, 1);
  assert.equal(runtime.payment.getPendingOrdersForCurrentUser().length, 1);
});

test('冷启动补查可以跳过过旧订单，避免历史测试订单阻塞首屏', async () => {
  const storage = {
    ashtanga_pending_membership_orders_v1: [{
      order_id: 'old-order',
      plan: 'quarter',
      user_id: 'user-1',
      created_at: Date.now() - 2 * 60 * 60 * 1000
    }]
  };
  let requests = 0;
  const runtime = loadPayment({
    storage,
    api() {
      requests += 1;
      throw new Error('旧订单不应在冷启动自动补查');
    }
  });

  const result = await runtime.payment.recoverPendingOrders({
    maxOrders: 1,
    maxAgeMs: 30 * 60 * 1000
  });
  assert.equal(requests, 0);
  assert.equal(result.errors, 0);
  assert.equal(runtime.payment.getPendingOrdersForCurrentUser().length, 1);
});
