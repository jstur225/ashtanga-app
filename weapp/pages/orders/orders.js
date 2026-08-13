const auth = require('../../services/auth');
const paymentService = require('../../services/payment');
const membershipService = require('../../services/membership');

function formatOrderTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function presentPaymentOrder(order) {
  const statusMap = {
    paid: { label: '已到账', className: 'paid' },
    refunded: { label: '已退款', className: 'refunded' },
    failed: { label: '支付失败', className: 'failed' },
    closed: { label: '已关闭', className: 'closed' },
    prepay: { label: '待确认', className: 'pending' },
    created: { label: '待支付', className: 'pending' },
    pending: { label: '待确认', className: 'pending' }
  };
  const status = statusMap[order.status] || { label: '待确认', className: 'pending' };
  const amount = Math.max(0, Number(order.amount_total) || 0) / 100;
  return {
    ...order,
    planName: order.plan === 'year' ? 'Pro 年卡' : order.plan === 'quarter' ? 'Pro 季卡' : order.description || 'Pro 会员',
    amountText: `¥${amount.toFixed(2)}`,
    createdAtText: formatOrderTime(order.created_at),
    paidAtText: formatOrderTime(order.paid_at),
    statusLabel: status.label,
    statusClass: status.className,
    isSandbox: Number(order.virtual_env) === 1,
    canRefresh: ['created', 'prepay', 'pending'].includes(order.status)
  };
}

Page({
  data: {
    orderLoading: true,
    paymentOrders: [],
    orderRefreshingId: '',
    errorMessage: ''
  },

  onLoad() {
    this.load();
  },

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },

  async load() {
    this.setData({ orderLoading: true, errorMessage: '' });
    try {
      const session = await auth.getValidSession();
      if (!session) {
        this.setData({ orderLoading: false, errorMessage: '请先登录账号后查看订单' });
        return;
      }
      await paymentService.recoverPendingOrders({ maxOrders: 5 }).catch(() => null);
      const orders = await paymentService.getOrders();
      this.setData({ paymentOrders: orders.map(presentPaymentOrder), orderLoading: false });
    } catch (error) {
      this.setData({
        orderLoading: false,
        errorMessage: (error && error.message) || '订单读取失败，请下拉重试'
      });
    }
  },

  async refreshOrder(event) {
    const orderId = event.currentTarget.dataset.orderId;
    if (!orderId || this.data.orderRefreshingId) return;
    this.setData({ orderRefreshingId: orderId });
    try {
      const result = await paymentService.queryOrderStatus(orderId);
      const orders = await paymentService.getOrders();
      this.setData({ paymentOrders: orders.map(presentPaymentOrder) });
      if (result && (result.status === 'paid' || result.status === 'success')) {
        await membershipService.getMembershipStatus({ force: true }).catch(() => null);
        wx.showToast({ title: '会员已到账', icon: 'success' });
      } else {
        wx.showToast({ title: '订单状态已刷新', icon: 'none' });
      }
    } catch (error) {
      wx.showToast({ title: (error && error.message) || '刷新失败', icon: 'none' });
    } finally {
      this.setData({ orderRefreshingId: '' });
    }
  }
});
