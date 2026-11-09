const auth = require('./auth');
const membershipService = require('./membership');
const { appApiRequest } = require('../utils/request');
const runtimeErrors = require('./runtime-errors');

const POLL_INTERVAL = 1500;
const POLL_MAX_TIMES = 40;
const PENDING_ORDER_STORAGE_KEY = 'ashtanga_pending_membership_orders_v1';
const PENDING_ORDER_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

let purchasing = false;
let recoveryPromise = null;

function currentUserId() {
  const session = auth.getStoredSession();
  return session && session.user && session.user.id ? String(session.user.id) : '';
}

function readPendingOrders() {
  const stored = wx.getStorageSync(PENDING_ORDER_STORAGE_KEY);
  const now = Date.now();
  const orders = Array.isArray(stored) ? stored : [];
  const valid = orders.filter((item) => {
    if (!item || !item.order_id || !item.user_id) return false;
    const createdAt = Number(item.created_at) || 0;
    return createdAt > 0 && now - createdAt <= PENDING_ORDER_MAX_AGE;
  });
  if (valid.length !== orders.length) {
    wx.setStorageSync(PENDING_ORDER_STORAGE_KEY, valid);
  }
  return valid;
}

function savePendingOrder(orderId, plan) {
  const userId = currentUserId();
  if (!orderId || !userId) return;
  const orders = readPendingOrders().filter((item) => item.order_id !== orderId);
  orders.push({
    order_id: String(orderId),
    plan: String(plan || ''),
    user_id: userId,
    created_at: Date.now()
  });
  wx.setStorageSync(PENDING_ORDER_STORAGE_KEY, orders.slice(-5));
}

function removePendingOrder(orderId) {
  if (!orderId) return;
  const orders = readPendingOrders().filter((item) => item.order_id !== orderId);
  wx.setStorageSync(PENDING_ORDER_STORAGE_KEY, orders);
}

function getPendingOrdersForCurrentUser() {
  const userId = currentUserId();
  if (!userId) return [];
  return readPendingOrders()
    .filter((item) => item.user_id === userId)
    .sort((a, b) => b.created_at - a.created_at);
}

function authenticatedApi(path, options = {}, retried = false) {
  return auth.getValidSession().then((session) => {
    if (!session) {
      const error = new Error('请先登录后开通会员');
      error.statusCode = 401;
      throw error;
    }
    return appApiRequest(path, {
      ...options,
      header: {
        ...(options.header || {}),
        Authorization: `Bearer ${session.access_token}`
      }
    }).then((result) => {
      if (result && (result.success === true || result.code === 0)) return result.data;
      throw new Error((result && (result.message || result.error)) || '请求失败');
    }).catch((error) => {
      if (!retried && auth.isRecoverableSessionError(error)) {
        return auth.refreshSession(session.refresh_token).then((refreshed) => {
          return appApiRequest(path, {
            ...options,
            header: {
              ...(options.header || {}),
              Authorization: `Bearer ${refreshed.access_token}`
            }
          }).then((retryResult) => {
            if (retryResult && (retryResult.success === true || retryResult.code === 0)) return retryResult.data;
            throw new Error((retryResult && (retryResult.message || retryResult.error)) || '请求失败');
          });
        });
      }
      throw error;
    });
  });
}

function loginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (result) => result.code
        ? resolve(result.code)
        : reject(new Error('未获得微信登录凭证，请重试')),
      fail: () => reject(new Error('获取微信登录凭证失败，请重试'))
    });
  });
}

function requestVirtualPayment(params) {
  return new Promise((resolve, reject) => {
    if (typeof wx.requestVirtualPayment !== 'function') {
      const unsupported = new Error('当前微信版本不支持虚拟支付，请升级微信后重试');
      unsupported.code = 'VIRTUAL_PAYMENT_UNSUPPORTED';
      reject(unsupported);
      return;
    }
    wx.requestVirtualPayment({
      signData: params.signData,
      paySig: params.paySig,
      signature: params.signature,
      mode: params.mode || 'short_series_goods',
      success: resolve,
      fail: (err) => {
        const errCode = Number(err && err.errCode);
        const message = err && err.errMsg ? err.errMsg : '支付失败';
        if (errCode === -2 || /cancel/i.test(message)) {
          resolve({ cancelled: true });
          return;
        }
        const error = new Error(message);
        error.errCode = errCode;
        error.paymentStage = 'requestVirtualPayment';
        const errorCodes = {
          '-4': 'VIRTUAL_PAYMENT_RISK_BLOCKED',
          '-5': 'VIRTUAL_PAYMENT_RESULT_UNKNOWN',
          '-15002': 'VIRTUAL_PAYMENT_ORDER_DUPLICATED',
          '-15005': 'VIRTUAL_PAYMENT_USER_SIGNATURE_INVALID',
          '-15006': 'VIRTUAL_PAYMENT_PAY_SIGNATURE_INVALID',
          '-15007': 'VIRTUAL_PAYMENT_SESSION_EXPIRED',
          '-15010': 'VIRTUAL_PAYMENT_PRODUCT_NOT_PUBLISHED',
          '-15011': 'VIRTUAL_PAYMENT_ENV_INVALID',
          '-15013': 'VIRTUAL_PAYMENT_PRICE_MISMATCH',
          '-15014': 'VIRTUAL_PAYMENT_PRODUCT_PENDING',
          '-15017': 'VIRTUAL_PAYMENT_MERCHANT_RESTRICTED',
          '-15018': 'VIRTUAL_PAYMENT_PRODUCT_REJECTED',
          '-15019': 'VIRTUAL_PAYMENT_MERCHANT_RESTRICTED',
          '-15020': 'VIRTUAL_PAYMENT_TOO_FAST',
          '-15021': 'VIRTUAL_PAYMENT_RATE_LIMITED'
        };
        error.code = errorCodes[String(errCode)] || 'VIRTUAL_PAYMENT_FAILED';
        reject(error);
      }
    });
  });
}

function friendlyPaymentError(error) {
  const message = error && error.message ? String(error.message) : '';
  const code = error && error.code ? String(error.code) : message;
  const messages = {
    PAYMENT_NOT_CONFIGURED: '虚拟支付服务尚未配置完成，请稍后再试',
    PAYMENT_CREATE_FAILED: '支付订单创建失败，请稍后重试',
    PAYMENT_STATUS_FAILED: '暂时无法确认支付结果',
    NOT_AUTHENTICATED: '登录已过期，请重新登录',
    INVALID_REQUEST: '支付参数有误，请重新选择套餐',
    VIRTUAL_PAYMENT_UNSUPPORTED: '当前微信版本不支持虚拟支付，请升级微信后重试',
    VIRTUAL_PAYMENT_RISK_BLOCKED: '本次交易被微信风控拦截，请稍后重试',
    VIRTUAL_PAYMENT_RESULT_UNKNOWN: '微信暂未确认支付结果，正在继续查询',
    VIRTUAL_PAYMENT_ORDER_DUPLICATED: '订单号已使用，请重新发起支付',
    VIRTUAL_PAYMENT_USER_SIGNATURE_INVALID: '微信登录态签名失效，请重新发起支付',
    VIRTUAL_PAYMENT_PAY_SIGNATURE_INVALID: '虚拟支付签名配置有误，请联系开发者',
    VIRTUAL_PAYMENT_SESSION_EXPIRED: '微信登录凭证已过期，请重新发起支付',
    VIRTUAL_PAYMENT_PRODUCT_NOT_PUBLISHED: '会员道具尚未发布到当前环境',
    VIRTUAL_PAYMENT_ENV_INVALID: '当前支付环境与小程序版本不匹配',
    VIRTUAL_PAYMENT_PRICE_MISMATCH: '会员道具价格与后台配置不一致',
    VIRTUAL_PAYMENT_PRODUCT_PENDING: '会员道具刚发布，预计十分钟后生效',
    VIRTUAL_PAYMENT_MERCHANT_RESTRICTED: '当前商户收款能力受到限制，请稍后再试',
    VIRTUAL_PAYMENT_PRODUCT_REJECTED: '会员道具审核未通过，暂时无法购买',
    VIRTUAL_PAYMENT_TOO_FAST: '操作过快，请稍候再试',
    VIRTUAL_PAYMENT_RATE_LIMITED: '当前交易较多，请稍后再试',
    VIRTUAL_PAYMENT_FAILED: '微信虚拟支付未完成，请稍后重试'
  };
  const friendly = new Error(messages[code] || messages[message] || message || '支付失败，请稍后重试');
  friendly.code = code;
  friendly.paymentStage = error && error.paymentStage ? error.paymentStage : '';
  return friendly;
}

function queryOrderStatus(orderId) {
  return authenticatedApi(`/api/membership/order/status?order_id=${encodeURIComponent(orderId)}`, {
    method: 'GET'
  });
}

function pollOrderStatus(orderId, onProgress) {
  let times = 0;
  return new Promise((resolve, reject) => {
    const poll = () => {
      times += 1;
      queryOrderStatus(orderId)
        .then((data) => {
          if (!data) {
            reject(new Error('订单状态查询失败'));
            return;
          }
          if (typeof onProgress === 'function') {
            onProgress({ status: data.status, times });
          }
          if (data.status === 'paid' || data.status === 'success') {
            removePendingOrder(orderId);
            resolve(data);
            return;
          }
          if (data.status === 'failed' || data.status === 'closed' || data.status === 'refunded') {
            removePendingOrder(orderId);
            reject(new Error(data.fail_reason || '支付未完成，订单已关闭'));
            return;
          }
          if (times >= POLL_MAX_TIMES) {
            reject(new Error('支付结果确认超时，如已扣款请勿重复支付'));
            return;
          }
          setTimeout(poll, POLL_INTERVAL);
        })
        .catch((error) => {
          if (times < POLL_MAX_TIMES) {
            setTimeout(poll, POLL_INTERVAL);
            return;
          }
          reject(friendlyPaymentError(error));
        });
    };
    poll();
  });
}

async function recoverPendingOrders(options = {}) {
  if (purchasing) return { recovered: 0, pending: 0, terminal: 0, errors: 0, skipped: true };
  if (recoveryPromise) return recoveryPromise;

  recoveryPromise = (async () => {
    const maxOrders = Math.max(1, Math.min(5, Number(options.maxOrders) || 3));
    const maxAgeMs = Math.max(0, Number(options.maxAgeMs) || 0);
    const now = Date.now();
    const orders = getPendingOrdersForCurrentUser()
      .filter((order) => !maxAgeMs || now - Number(order.created_at || 0) <= maxAgeMs)
      .slice(0, maxOrders);
    const trace = runtimeErrors.startTrace('payment', 'recover_pending_orders', {
      candidate_count: orders.length,
      max_orders: maxOrders,
      max_age_ms: maxAgeMs
    });
    const result = { recovered: 0, pending: 0, terminal: 0, errors: 0 };
    let shouldRefreshMembership = false;

    for (const order of orders) {
      try {
        const data = await queryOrderStatus(order.order_id);
        if (typeof options.onProgress === 'function') {
          options.onProgress({ order, status: data && data.status });
        }
        if (data && (data.status === 'paid' || data.status === 'success')) {
          removePendingOrder(order.order_id);
          result.recovered += 1;
          shouldRefreshMembership = true;
        } else if (data && ['failed', 'closed', 'refunded'].includes(data.status)) {
          removePendingOrder(order.order_id);
          result.terminal += 1;
        } else {
          result.pending += 1;
        }
      } catch (error) {
        const message = error && error.message ? String(error.message) : '';
        if ((error && error.statusCode === 404) || /ORDER_NOT_FOUND/.test(message)) {
          removePendingOrder(order.order_id);
          result.terminal += 1;
        } else {
          result.errors += 1;
        }
      }
    }

    if (shouldRefreshMembership) {
      result.membership = await membershipService.getMembershipStatus({ force: true }).catch(() => null);
    }
    runtimeErrors.finishTrace(trace, result.errors ? 'warning' : 'success', {
      recovered: result.recovered,
      pending: result.pending,
      terminal: result.terminal,
      errors: result.errors
    });
    return result;
  })().finally(() => {
    recoveryPromise = null;
  });

  return recoveryPromise;
}

async function purchase(plan, options = {}) {
  if (purchasing) throw new Error('正在处理上一笔订单，请稍候');
  if (!plan || !['quarter', 'year'].includes(plan)) {
    throw new Error('请选择有效的会员套餐');
  }
  purchasing = true;
  const trace = runtimeErrors.startTrace('payment', 'membership_purchase', { plan });
  try {
    const code = await loginCode();
    runtimeErrors.recordEvent('payment', 'wx_login_code_ready');
    const order = await authenticatedApi('/api/membership/order/create', {
      method: 'POST',
      data: { plan, code }
    });
    if (!order || !order.order_id || !order.signData || !order.paySig || !order.signature) {
      throw new Error('订单创建失败，请重试');
    }
    savePendingOrder(order.order_id, plan);
    runtimeErrors.recordEvent('payment', 'order_created', { plan });
    try {
      const payResult = await requestVirtualPayment(order);
      if (payResult && payResult.cancelled) {
        removePendingOrder(order.order_id);
        // 让服务端把微信侧“已关闭”状态回写，订单列表直接显示“已关闭/未支付”，无需手动刷新。
        queryOrderStatus(order.order_id).catch(() => null);
        runtimeErrors.finishTrace(trace, 'warning', { result: 'cancelled' });
        return { cancelled: true, order_id: order.order_id };
      }
      runtimeErrors.recordEvent('payment', 'cashier_completed', { result: 'accepted' });
    } catch (error) {
      if (!error || error.code !== 'VIRTUAL_PAYMENT_RESULT_UNKNOWN') {
        removePendingOrder(order.order_id);
        throw error;
      }
      runtimeErrors.recordEvent('payment', 'cashier_result_unknown', {
        code: error.code
      }, { level: 'warning', immediate: true });
    }
    let paid = null;
    if (!options.skipPoll) {
      paid = await pollOrderStatus(order.order_id, options.onProgress);
    }
    try {
      await membershipService.getMembershipStatus({ force: true });
    } catch (error) {
      // 会员状态刷新失败不改变已确认的支付结果，页面稍后会再次读取。
    }
    runtimeErrors.finishTrace(trace, 'success', {
      result: paid && paid.status ? paid.status : options.skipPoll ? 'poll_skipped' : 'paid'
    });
    return { success: true, order_id: order.order_id, membership: paid };
  } catch (error) {
    const friendly = friendlyPaymentError(error);
    runtimeErrors.finishTrace(trace, 'error', {
      code: friendly.code,
      stage: friendly.paymentStage,
      message: friendly.message
    });
    throw friendly;
  } finally {
    purchasing = false;
  }
}

async function getPlans() {
  try {
    return await authenticatedApi('/api/membership/plans', { method: 'GET' });
  } catch (error) {
    return null;
  }
}

async function getOrders() {
  const orders = await authenticatedApi('/api/membership/order/list', { method: 'GET' });
  return Array.isArray(orders) ? orders : [];
}

module.exports = {
  purchase,
  getPlans,
  getOrders,
  pollOrderStatus,
  queryOrderStatus,
  recoverPendingOrders,
  getPendingOrdersForCurrentUser,
  PENDING_ORDER_STORAGE_KEY,
  requestVirtualPayment,
  isPurchasing: () => purchasing,
  friendlyPaymentError
};
