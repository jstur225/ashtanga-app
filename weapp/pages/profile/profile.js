const auth = require('../../services/auth');
const dataRepository = require('../../services/data-repository');
const localProfile = require('../../services/local-profile');
const localData = require('../../services/local-data');
const dataCapsule = require('../../services/data-capsule');
const debugLogExport = require('../../services/debug-log-export');
const membershipService = require('../../services/membership');
const paymentService = require('../../services/payment');
const photoStorage = require('../../services/photo-storage');
const runtimeErrors = require('../../services/runtime-errors');
const pageRefreshGate = require('../../services/page-refresh-gate');
const { getMoonType, getMoonIcon } = require('../../services/moon-days');

const DEFAULT_PROFILE = localProfile.DEFAULT_PROFILE;

const SETTINGS_TABS = [
  { id: 'profile', label: '个人资料' },
  { id: 'membership', label: '会员' },
  { id: 'account', label: '账户同步' },
  { id: 'data', label: '数据管理' }
];

const PRO_BENEFITS = [
  { feature: '每条记录照片', free: '1 张', pro: '9 张' },
  { feature: '单张照片大小', free: '5 MB', pro: '30 MB' },
  { feature: '练习选项', free: '3 个', pro: '11 个' },
  { feature: '日历标注', free: '1 种', pro: '9 种' },
  { feature: '日历颜色', free: '1 种', pro: '4 种' },
  { feature: '唱诵倒计时', free: '1 分钟', pro: '自定义' }
];

const DEFAULT_PAYMENT_PLANS = [
  { id: 'quarter', name: '季卡', price: '19.8', amount_total: 1980, duration_days: 90, recommended: false },
  { id: 'year', name: '年卡', price: '69.8', amount_total: 6980, duration_days: 365, recommended: true }
];

function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function maskEmail(email) {
  if (!email) return '';
  const [username, domain] = String(email).split('@');
  if (!username || !domain) return email;
  if (username.length <= 6) return `${username.slice(0, 3)}***@${domain}`;
  return `${username.slice(0, 3)}****${username.slice(-3)}@${domain}`;
}

function getRecordSeconds(record) {
  return Math.max(0, Number(record.duration) || 0);
}

function getColorLevel(record, optionColorMap) {
  if (record.color_level) return Math.min(4, Math.max(1, Number(record.color_level) || 3));
  const level = optionColorMap[record.type];
  return level ? Math.min(4, Math.max(1, Number(level) || 3)) : 3;
}

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

function compressAvatar(path) {
  if (!wx.compressImage) return Promise.resolve(path);
  return new Promise((resolve) => {
    wx.compressImage({
      src: path,
      quality: 85,
      success(result) { resolve(result.tempFilePath || path); },
      fail() { resolve(path); }
    });
  });
}

Page({
  data: {
    loading: false,
    submitLoading: false,
    userEmail: '',
    maskedUserId: 'ANONYMOUS',
    isLoggedIn: false,
    isAccountMode: false,
    profileName: DEFAULT_PROFILE.name,
    profileSignature: DEFAULT_PROFILE.signature,
    draftProfileName: DEFAULT_PROFILE.name,
    draftProfileSignature: DEFAULT_PROFILE.signature,
    profileAvatar: '',
    uploadingAvatar: false,
    isPro: false,
    isIOS: false,
    authorWechatId: 'xiao519216978',
    membershipLoading: false,
    membershipText: '',
    membershipType: null,
    membershipExpiresAt: '',
    membershipDaysRemaining: 0,
    syncStatus: 'idle',
    pendingSyncCount: 0,
    lastSyncText: '尚未同步',
    totalDays: 0,
    totalHours: 0,
    avgMinutes: 0,
    historicalDays: 0,
    historicalAvgMinutes: 0,
    historicalHours: 0,
    heatmapMonths: [],
    proBenefits: PRO_BENEFITS,
    settingsOpen: false,
    settingsTabs: SETTINGS_TABS,
    activeSettingsTab: 'profile',
    showPurchaseShell: false,
    showOrderShell: false,
    orderLoading: false,
    orderRefreshingId: '',
    paymentOrders: [],
    paymentPlans: DEFAULT_PAYMENT_PLANS,
    selectedPaymentPlan: 'year',
    selectedPaymentPrice: '69.8',
    purchaseLoading: false,
    purchaseStatusText: '',
    purchaseAgreementChecked: false,
    showLogoutShell: false,
    showPasswordShell: false,
    showAuthModal: false,
    authInitialMode: 'login',
    showExportShell: false,
    exportText: '',
    showImportShell: false,
    importText: '',
    showDebugLogShell: false,
    debugLogText: '',
    debugLogGenerating: false,
    debugLogExporting: false,
    showClearDataShell: false,
    clearDataStep: 1,
    clearConfirmPhrase: '',
    clearDataAlsoLogout: false
  },

  onShow() {
    if (!this._platformChecked) {
      this._platformChecked = true;
      const sys = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
      this.setData({ isIOS: String(sys.platform || '').toLowerCase() === 'ios' });
    }
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hidden: false });
    }
    const cacheTrace = runtimeErrors.startTrace('page', 'profile_cache_render');
    this.hydrateFromCache();
    runtimeErrors.finishTrace(cacheTrace, 'success', {
      total_days: this.data.totalDays,
      is_logged_in: this.data.isLoggedIn
    });
    const pendingSettingsTab = wx.getStorageSync('ashtanga_profile_settings_tab');
    if (pendingSettingsTab) {
      wx.removeStorageSync('ashtanga_profile_settings_tab');
      this.setData({
        settingsOpen: true,
        activeSettingsTab: pendingSettingsTab
      }, () => this.setTabBarHidden(true));
    }
    pageRefreshGate.run(this.getRefreshGateKey(), () => this.loadPage()).catch(() => null);
  },

  getRefreshGateKey() {
    const session = auth.getStoredSession();
    const userId = session && session.user ? session.user.id || 'account' : 'guest';
    return `profile:${dataRepository.getMode()}:${userId}`;
  },

  applyPageData({ user, profile, records, options, membership, membershipLoading = false }) {
    const year = new Date().getFullYear();
    const safeProfile = profile || DEFAULT_PROFILE;
    const safeRecords = Array.isArray(records) ? records : [];
    const safeOptions = Array.isArray(options) ? options : [];
    const safeMembership = membership || membershipService.EMPTY_STATUS;
    const stats = this.buildTotalStats(safeRecords, safeProfile);
    const userEmail = user && user.email ? user.email : '';
    const recordSyncState = dataRepository.getRecordSyncState();
    this.profileRecords = safeRecords;
    this.profileOptions = safeOptions;
    const nextData = {
      loading: false,
      isLoggedIn: Boolean(user),
      isAccountMode: dataRepository.getMode() === 'cloud',
      userEmail,
      maskedUserId: userEmail ? maskEmail(userEmail) : 'ANONYMOUS',
      profileName: safeProfile.name,
      profileSignature: safeProfile.signature,
      profileAvatar: safeProfile.avatar,
      isPro: safeMembership.is_active,
      membershipLoading,
      membershipText: safeMembership.is_active
        ? `Pro 有效期至 ${safeMembership.expires_at_formatted || ''} · ${safeMembership.days_remaining}天`
        : '',
      membershipType: safeMembership.type,
      membershipExpiresAt: safeMembership.expires_at_formatted || '',
      membershipDaysRemaining: safeMembership.days_remaining,
      totalDays: stats.totalDays,
      totalHours: stats.totalHours,
      avgMinutes: stats.avgMinutes,
      historicalDays: safeProfile.historical_days,
      historicalAvgMinutes: safeProfile.historical_avg_minutes,
      historicalHours: this.calculateHistoricalHours(safeProfile.historical_days, safeProfile.historical_avg_minutes),
      heatmapMonths: this.buildHeatmapMonths(year, safeRecords, safeOptions),
      pendingSyncCount: recordSyncState.pending,
      syncStatus: recordSyncState.pending > 0 ? 'error' : 'idle',
      lastSyncText: recordSyncState.last_sync_at
        ? `最近同步 ${String(recordSyncState.last_sync_at).replace('T', ' ').slice(0, 16)}`
        : '尚未同步'
    };
    if (!this.data.settingsOpen) {
      nextData.draftProfileName = safeProfile.name;
      nextData.draftProfileSignature = safeProfile.signature;
    }
    this.setData(nextData);
  },

  hydrateFromCache() {
    const year = new Date().getFullYear();
    const storedSession = auth.getStoredSession();
    const cachedMembership = membershipService.getCachedStatus(storedSession);
    this.applyPageData({
      user: storedSession && storedSession.user ? storedSession.user : null,
      profile: dataRepository.getCachedProfile(),
      records: dataRepository.getCachedRecordsByDateRange(`${year}-01-01`, `${year}-12-31`),
      options: dataRepository.getCachedPracticeOptions(),
      membership: cachedMembership || membershipService.EMPTY_STATUS,
      membershipLoading: Boolean(storedSession && !cachedMembership)
    });
  },

  async loadPage() {
    const trace = runtimeErrors.startTrace('page', 'profile_background_refresh');
    const storedSession = auth.getStoredSession();
    const cachedMembership = membershipService.getCachedStatus(storedSession);
    this.setData({ membershipLoading: Boolean(storedSession && !cachedMembership) });
    const year = new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const user = storedSession && storedSession.user ? storedSession.user : null;

    try {
      if (storedSession) {
        paymentService.recoverPendingOrders({ maxOrders: 1, maxAgeMs: 30 * 60 * 1000 }).then((result) => {
          if (result && result.membership) {
            this.applyPageData({
              user,
              profile: dataRepository.getCachedProfile(),
              records: dataRepository.getCachedRecordsByDateRange(startDate, endDate),
              options: dataRepository.getCachedPracticeOptions(),
              membership: result.membership,
              membershipLoading: false
            });
          }
        }).catch(() => null);
      }

      const [profile, records, options, membership] = await Promise.all([
        dataRepository.getProfile(),
        dataRepository.getRecordsByDateRange(startDate, endDate),
        dataRepository.getPracticeOptions(),
        storedSession
          ? membershipService.getMembershipStatus().catch(() => membershipService.EMPTY_STATUS)
          : Promise.resolve(membershipService.EMPTY_STATUS)
      ]);
      this.applyPageData({
        user,
        profile,
        records,
        options,
        membership,
        membershipLoading: false
      });
      runtimeErrors.finishTrace(trace, 'success', {
        record_count: records.length,
        option_count: options.length,
        membership_active: Boolean(membership && membership.is_active)
      });
    } catch (error) {
      runtimeErrors.finishTrace(trace, 'error', { message: error && error.message });
      this.setData({
        loading: false,
        membershipLoading: false
      });
    }
  },

  buildTotalStats(records, profile = DEFAULT_PROFILE) {
    const activeRecords = records.filter((record) => !record.is_tutorial && getRecordSeconds(record) > 0);
    const totalSeconds = activeRecords.reduce((sum, record) => sum + getRecordSeconds(record), 0);
    const localMinutes = Math.round(totalSeconds / 60);
    const historicalDays = Math.max(0, Number(profile.historical_days) || 0);
    const historicalMinutes = historicalDays * Math.max(0, Number(profile.historical_avg_minutes) || 0);
    const totalDays = activeRecords.length + historicalDays;
    const totalMinutes = localMinutes + historicalMinutes;
    return {
      totalDays,
      totalHours: Math.round(totalMinutes / 60),
      avgMinutes: totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0
    };
  },

  calculateHistoricalHours(days, avgMinutes) {
    return Math.round((Math.max(0, Number(days) || 0) * Math.max(0, Number(avgMinutes) || 0)) / 60);
  },

  buildHeatmapMonths(year, records, options) {
    const optionColorMap = {};
    options.forEach((option) => {
      optionColorMap[option.label] = option.color_level || 3;
    });

    const dayMap = {};
    records.forEach((record) => {
      if (!record.date || record.deleted_at) return;
      const current = dayMap[record.date] || { minutes: 0, colorLevel: 0 };
      current.minutes += Math.round(getRecordSeconds(record) / 60);
      current.colorLevel = Math.max(current.colorLevel, getColorLevel(record, optionColorMap));
      dayMap[record.date] = current;
    });

    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, dayIndex) => {
        const date = formatDate(year, month, dayIndex + 1);
        const record = dayMap[date];
        const moonType = getMoonType(date);
        const colorLevel = record ? Math.max(1, record.colorLevel || 3) : 0;
        return {
          date,
          count: record ? record.minutes : 0,
          colorLevel,
          colorClass: colorLevel > 0 ? `green-gradient-${colorLevel}` : '',
          moonType,
          moonIcon: getMoonIcon(date),
          practiced: Boolean(record)
        };
      });
      return {
        monthKey: `${year}-${String(month).padStart(2, '0')}`,
        monthLabel: `${month}月`,
        days
      };
    });
  },

  openSettings(event) {
    const tab = event && event.currentTarget && event.currentTarget.dataset.tab;
    this.setData({
      settingsOpen: true,
      activeSettingsTab: tab || 'profile',
      draftProfileName: this.data.profileName,
      draftProfileSignature: this.data.profileSignature
    }, () => this.setTabBarHidden(true));
  },

  closeSettings() {
    this.setData({ settingsOpen: false }, () => this.setTabBarHidden(false));
  },

  switchSettingsTab(event) {
    const tab = event.currentTarget.dataset.tab;
    if (!tab) return;
    this.setData({ activeSettingsTab: tab });
  },

  onProfileNameInput(event) {
    this.setData({ draftProfileName: event.detail.value });
  },

  onProfileSignatureInput(event) {
    this.setData({ draftProfileSignature: event.detail.value });
  },

  chooseAvatar() {
    if (!this.data.isLoggedIn || !this.data.isAccountMode) {
      this.setData({ activeSettingsTab: 'account' });
      wx.showToast({ title: '绑定邮箱后可上传头像', icon: 'none' });
      return;
    }
    if (this.data.uploadingAvatar) return;
    const handlePath = (path) => {
      if (path) this.uploadAvatar(path);
    };
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (result) => handlePath(result.tempFiles && result.tempFiles[0] && result.tempFiles[0].tempFilePath)
      });
      return;
    }
    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (result) => handlePath(result.tempFilePaths && result.tempFilePaths[0])
    });
  },

  async uploadAvatar(path) {
    this.setData({ uploadingAvatar: true });
    try {
      await photoStorage.validatePhotoSize(path, { isPro: false });
      const compressedPath = await compressAvatar(path);
      const avatar = await photoStorage.uploadAvatar(compressedPath);
      const profile = await dataRepository.saveProfile({
        name: this.data.draftProfileName,
        signature: this.data.draftProfileSignature,
        avatar,
        historical_days: this.data.historicalDays,
        historical_avg_minutes: this.data.historicalAvgMinutes
      });
      this.setData({
        profileAvatar: profile.avatar || avatar,
        profileName: profile.name,
        profileSignature: profile.signature,
        draftProfileName: profile.name,
        draftProfileSignature: profile.signature
      });
      wx.showToast({ title: '头像上传成功', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '头像上传失败，请重试', icon: 'none' });
    } finally {
      this.setData({ uploadingAvatar: false });
    }
  },

  onHistoricalDaysInput(event) {
    const value = String(event.detail.value || '').replace(/[^0-9]/g, '');
    const historicalDays = value ? Number(value) : 0;
    this.setData({
      historicalDays,
      historicalHours: this.calculateHistoricalHours(historicalDays, this.data.historicalAvgMinutes)
    });
  },

  onHistoricalAvgMinutesInput(event) {
    const value = String(event.detail.value || '').replace(/[^0-9]/g, '');
    const historicalAvgMinutes = value ? Number(value) : 0;
    this.setData({
      historicalAvgMinutes,
      historicalHours: this.calculateHistoricalHours(this.data.historicalDays, historicalAvgMinutes)
    });
  },

  async saveProfileSettings() {
    if (this.data.submitLoading) return;
    this.setData({ submitLoading: true });
    try {
      const profile = await dataRepository.saveProfile({
        name: this.data.draftProfileName,
        signature: this.data.draftProfileSignature,
        avatar: this.data.profileAvatar,
        historical_days: this.data.historicalDays,
        historical_avg_minutes: this.data.historicalAvgMinutes
      });
      const stats = this.buildTotalStats(this.profileRecords || [], profile);
      this.setData({
        profileName: profile.name,
        profileSignature: profile.signature,
        draftProfileName: profile.name,
        draftProfileSignature: profile.signature,
        profileAvatar: profile.avatar,
        historicalDays: profile.historical_days,
        historicalAvgMinutes: profile.historical_avg_minutes,
        historicalHours: this.calculateHistoricalHours(profile.historical_days, profile.historical_avg_minutes),
        totalDays: stats.totalDays,
        totalHours: stats.totalHours,
        avgMinutes: stats.avgMinutes,
        settingsOpen: false
      }, () => this.setTabBarHidden(false));
      const syncState = dataRepository.getRecordSyncState();
      wx.showToast({
        title: syncState.pending > 0 ? '已保存本机，等待同步' : '设置已保存',
        icon: syncState.pending > 0 ? 'none' : 'success'
      });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ submitLoading: false });
    }
  },

  copyAuthorWechat() {
    wx.setClipboardData({
      data: this.data.authorWechatId,
      success: () => wx.showToast({ title: '微信号已复制', icon: 'success' }),
      fail: () => wx.showToast({ title: '复制失败，请手动复制', icon: 'none' })
    });
  },

  onMembershipActionTap() {
    if (this.data.isIOS) {
      this.copyAuthorWechat();
      wx.showToast({ title: 'iOS 暂不支持在线购买，已复制微信号，请联系作者开通', icon: 'none' });
      return;
    }
    this.openMembershipShell();
  },

  async openMembershipShell() {
    if (!this.data.isLoggedIn) {
      this.setData({ showAuthModal: true, authInitialMode: 'login' });
      wx.showToast({ title: '请先登录账号再开通会员', icon: 'none' });
      return;
    }
    this.setData({
      showPurchaseShell: true,
      purchaseStatusText: '',
      purchaseAgreementChecked: false,
      selectedPaymentPlan: 'year',
      selectedPaymentPrice: '69.8'
    });
    this.setTabBarHidden(true);
    try {
      const plans = await paymentService.getPlans();
      if (Array.isArray(plans) && plans.length) {
        const selected = plans.find((item) => item.id === this.data.selectedPaymentPlan) || plans[0];
        this.setData({
          paymentPlans: plans,
          selectedPaymentPlan: selected.id,
          selectedPaymentPrice: selected.price
        });
      }
    } catch (error) {
      // 套餐读取失败时继续使用与服务端一致的内置展示值；创建订单仍由服务端校验金额。
    }
  },

  async openOrderShell() {
    if (!this.data.isLoggedIn) {
      this.setData({ showAuthModal: true, authInitialMode: 'login' });
      wx.showToast({ title: '请先登录账号查看订单', icon: 'none' });
      return;
    }
    this.setData({ showOrderShell: true, orderLoading: true, paymentOrders: [] });
    this.setTabBarHidden(true);
    try {
      await paymentService.recoverPendingOrders({ maxOrders: 5 }).catch(() => null);
      await this.loadPaymentOrders();
    } catch (error) {
      wx.showToast({ title: error && error.message ? error.message : '订单读取失败', icon: 'none' });
    } finally {
      this.setData({ orderLoading: false });
    }
  },

  closeOrderShell() {
    if (this.data.orderRefreshingId) return;
    this.setData({ showOrderShell: false, paymentOrders: [] });
    this.setTabBarHidden(Boolean(this.data.settingsOpen));
  },

  async loadPaymentOrders() {
    const orders = await paymentService.getOrders();
    this.setData({ paymentOrders: orders.map(presentPaymentOrder) });
  },

  async refreshPaymentOrder(event) {
    const orderId = event.currentTarget.dataset.orderId;
    if (!orderId || this.data.orderRefreshingId) return;
    this.setData({ orderRefreshingId: orderId });
    try {
      const result = await paymentService.queryOrderStatus(orderId);
      await this.loadPaymentOrders();
      if (result && (result.status === 'paid' || result.status === 'success')) {
        const membership = await membershipService.getMembershipStatus({ force: true });
        this.setData({
          isPro: membership.is_active,
          membershipText: membership.is_active
            ? `Pro 有效期至 ${membership.expires_at_formatted || ''} · ${membership.days_remaining}天`
            : '',
          membershipType: membership.type,
          membershipExpiresAt: membership.expires_at_formatted || '',
          membershipDaysRemaining: membership.days_remaining
        });
        wx.showToast({ title: '会员已到账', icon: 'success' });
      } else {
        wx.showToast({ title: '订单状态已刷新', icon: 'none' });
      }
    } catch (error) {
      wx.showToast({ title: error && error.message ? error.message : '订单刷新失败', icon: 'none' });
    } finally {
      this.setData({ orderRefreshingId: '' });
    }
  },

  closeMembershipShell() {
    if (this.data.purchaseLoading) return;
    this.setData({ showPurchaseShell: false, purchaseAgreementChecked: false });
    this.setTabBarHidden(Boolean(this.data.settingsOpen));
  },

  togglePurchaseAgreement() {
    if (this.data.purchaseLoading) return;
    this.setData({ purchaseAgreementChecked: !this.data.purchaseAgreementChecked });
  },

  selectPaymentPlan(event) {
    if (this.data.purchaseLoading) return;
    const planId = event.currentTarget.dataset.plan;
    const selected = this.data.paymentPlans.find((item) => item.id === planId);
    if (!selected) return;
    this.setData({
      selectedPaymentPlan: selected.id,
      selectedPaymentPrice: selected.price,
      purchaseStatusText: ''
    });
  },

  async startMembershipPurchase() {
    if (this.data.purchaseLoading) return;
    if (!this.data.purchaseAgreementChecked) {
      wx.showToast({ title: '请先确认会员购买说明', icon: 'none' });
      return;
    }
    const wasPro = this.data.isPro;
    this.setData({ purchaseLoading: true, purchaseStatusText: '正在创建微信支付订单…' });
    try {
      const result = await paymentService.purchase(this.data.selectedPaymentPlan, {
        onProgress: ({ status }) => {
          this.setData({
            purchaseStatusText: status === 'pending' || status === 'prepay'
              ? '付款已提交，正在确认到账…'
              : '正在确认会员状态…'
          });
        }
      });
      if (result && result.cancelled) {
        this.setData({ purchaseStatusText: '已取消支付' });
        return;
      }
      const membership = await membershipService.getMembershipStatus({ force: true });
      this.setData({
        showPurchaseShell: false,
        isPro: membership.is_active,
        membershipLoading: false,
        membershipText: membership.is_active
          ? `Pro 有效期至 ${membership.expires_at_formatted || ''} · ${membership.days_remaining}天`
          : '',
        membershipType: membership.type,
        membershipExpiresAt: membership.expires_at_formatted || '',
        membershipDaysRemaining: membership.days_remaining,
        purchaseStatusText: ''
      });
      this.setTabBarHidden(Boolean(this.data.settingsOpen));
      wx.showToast({ title: wasPro ? '续费成功' : 'Pro 已开通', icon: 'success' });
    } catch (error) {
      const message = error && error.message ? error.message : '支付未完成，请稍后重试';
      const capabilityBanned = error && [
        'PAYMENT_NOT_CONFIGURED',
        'VIRTUAL_PAYMENT_UNSUPPORTED',
        'VIRTUAL_PAYMENT_PAY_SIGNATURE_INVALID',
        'VIRTUAL_PAYMENT_USER_SIGNATURE_INVALID',
        'VIRTUAL_PAYMENT_SESSION_EXPIRED',
        'VIRTUAL_PAYMENT_PRODUCT_NOT_PUBLISHED',
        'VIRTUAL_PAYMENT_ENV_INVALID',
        'VIRTUAL_PAYMENT_PRICE_MISMATCH',
        'VIRTUAL_PAYMENT_PRODUCT_PENDING',
        'VIRTUAL_PAYMENT_PRODUCT_REJECTED',
        'VIRTUAL_PAYMENT_MERCHANT_RESTRICTED'
      ].includes(error.code);
      this.setData({ purchaseStatusText: message });
      wx.showModal({
        title: capabilityBanned ? '暂时无法发起支付' : '支付结果未确认',
        content: capabilityBanned
          ? `${message}\n本次未进入微信收银台，不会产生扣款。`
          : `${message}\n如微信已经扣款，请勿重复支付，稍后重新打开会员页面即可自动查询。`,
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#9A7438'
      });
    } finally {
      this.setData({ purchaseLoading: false });
    }
  },

  openLogoutShell() {
    this.setData({ showLogoutShell: true });
  },

  openLogoutAndClear() {
    this.setData({
      showLogoutShell: false,
      showClearDataShell: true,
      clearDataStep: 1,
      clearConfirmPhrase: '',
      clearDataAlsoLogout: true
    });
  },

  closeLogoutShell() {
    this.setData({ showLogoutShell: false });
  },

  openPasswordShell() {
    this.setData({ showPasswordShell: true });
  },

  closePasswordShell() {
    this.setData({ showPasswordShell: false });
  },

  onPasswordChanged() {
    this.setData({ showPasswordShell: false });
    wx.showToast({ title: '密码修改成功', icon: 'success' });
  },

  openExportShell() {
    const exportText = dataCapsule.exportLocalData({
      records: this.profileRecords || [],
      options: this.profileOptions || [],
      profile: dataRepository.getCachedProfile(),
      annotations: dataRepository.getCachedAnnotations()
    });
    this.setData({ showExportShell: true, exportText });
  },

  closeExportShell() {
    this.setData({ showExportShell: false });
  },

  copyExportData() {
    wx.setClipboardData({
      data: this.data.exportText,
      success: () => wx.showToast({ title: '数据胶囊已复制', icon: 'success' }),
      fail: () => wx.showToast({ title: '复制失败，请手动复制', icon: 'none' })
    });
  },

  openImportShell() {
    this.setData({ showImportShell: true, importText: '' });
  },

  closeImportShell() {
    this.setData({ showImportShell: false, importText: '' });
  },

  onImportTextInput(event) {
    this.setData({ importText: event.detail.value });
  },

  pasteImportData() {
    wx.getClipboardData({
      success: (result) => {
        this.setData({ importText: result.data || '' });
        wx.showToast({ title: '已粘贴', icon: 'success' });
      },
      fail: () => wx.showToast({ title: '无法读取剪贴板', icon: 'none' })
    });
  },

  confirmImportData() {
    const text = String(this.data.importText || '').trim();
    if (!text) {
      wx.showToast({ title: '请先粘贴数据胶囊', icon: 'none' });
      return;
    }
    const parsed = dataCapsule.parseAndValidateImportData(text);
    if (!parsed.valid) {
      wx.showToast({ title: parsed.error || '数据格式错误', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '覆盖本地数据？',
      content: '导入会替换这台设备上的本地记录、练习选项、个人资料和日历标注。云端数据不会被删除。',
      confirmText: '确认导入',
      confirmColor: '#2D5A27',
      success: async (result) => {
        if (!result.confirm) return;
        const imported = dataCapsule.importLocalData(text);
        if (!imported.valid) {
          wx.showToast({ title: imported.error || '导入失败', icon: 'none' });
          return;
        }
        const counts = imported.counts || {};
        wx.removeStorageSync('weapp_account_mode_enabled');
        wx.setStorageSync('weapp_guest_mode_enabled', true);
        getApp().globalData.dataMode = 'guest';
        localData.ensureTutorialRecord();
        this.setData({ showImportShell: false, importText: '' });
        await this.loadPage();
        wx.showModal({
          title: '数据导入成功',
          content: `已导入 ${counts.records || 0} 条记录，其中 ${counts.completed_records || 0} 条计入统计。当前已切换到本地模式。`,
          showCancel: false,
          confirmText: '知道了',
          confirmColor: '#2D5A27'
        });
      }
    });
  },

  async openDebugLogShell() {
    if (this.data.debugLogGenerating) return;
    runtimeErrors.recordEvent('diagnostics', 'debug_log_opened');
    this.setData({ debugLogGenerating: true });
    try {
      runtimeErrors.flushEvents();
      await Promise.resolve();
      const debugLogText = await this.buildCurrentDebugLog();
      this._preparedDebugLogFiles = await debugLogExport.prepareDebugLogFiles(debugLogText);
      this.setData({
        debugLogText,
        showDebugLogShell: true
      });
    } catch (error) {
      runtimeErrors.recordRuntimeError('debug_log_generation_failed', error);
      wx.showToast({ title: '日志生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ debugLogGenerating: false });
    }
  },

  buildCurrentDebugLog() {
    return dataCapsule.collectDebugLog({
      dataMode: dataRepository.getMode(),
      activeSettingsTab: this.data.activeSettingsTab,
      isLoggedIn: this.data.isLoggedIn,
      isPro: this.data.isPro,
      membershipType: this.data.membershipType,
      membershipExpiresAt: this.data.membershipExpiresAt,
      membershipDaysRemaining: this.data.membershipDaysRemaining,
      membershipLoading: this.data.membershipLoading,
      syncStatus: this.data.syncStatus,
      pendingSyncCount: this.data.pendingSyncCount,
      totalDays: this.data.totalDays,
      totalHours: this.data.totalHours,
      avgMinutes: this.data.avgMinutes,
      settingsOpen: this.data.settingsOpen
    });
  },

  closeDebugLogShell() {
    if (this.data.debugLogExporting) return;
    this._preparedDebugLogFiles = null;
    this.setData({ showDebugLogShell: false });
  },

  copyDebugLogFallback() {
    runtimeErrors.flushEvents();
    wx.setClipboardData({
      data: this.data.debugLogText,
      success: () => {
        runtimeErrors.recordEvent('diagnostics', 'debug_log_copied_as_fallback');
        wx.showModal({
          title: '文件分享暂不可用',
          content: 'JSON 日志已经生成，并已复制完整内容。请粘贴保存为 .json 文件后发给开发者。',
          showCancel: false,
          confirmText: '知道了',
          confirmColor: '#2D5A27'
        });
      },
      fail: () => wx.showToast({ title: '复制失败，请稍后重试', icon: 'none' })
    });
  },

  showDebugLogShareUnavailable(result = {}) {
    const attempts = Array.isArray(result.attempts) ? result.attempts : [];
    const lastAttempt = attempts[attempts.length - 1] || result;
    const errorMessage = lastAttempt && lastAttempt.error && lastAttempt.error.errMsg
      ? String(lastAttempt.error.errMsg)
      : '';
    const isDevTools = result.platform === 'devtools' || /devtools|not supported/i.test(errorMessage);
    runtimeErrors.recordEvent('diagnostics', 'debug_log_share_unavailable', {
      platform: result.platform || 'unknown',
      reason: result.reason || 'unknown',
      attempted_formats: attempts.map((item) => item.format),
      error_message: errorMessage
    });
    wx.showModal({
      title: isDevTools ? '\u8bf7\u5728\u624b\u673a\u771f\u673a\u5206\u4eab' : '\u65e5\u5fd7\u6587\u4ef6\u5206\u4eab\u5931\u8d25',
      content: isDevTools
        ? '\u5fae\u4fe1\u5f00\u53d1\u8005\u5de5\u5177\u4e0d\u652f\u6301\u6587\u4ef6\u8f6c\u53d1\u3002\u8bf7\u5728\u624b\u673a\u5fae\u4fe1\u4e2d\u6253\u5f00\u5c0f\u7a0b\u5e8f\uff0c\u518d\u6b21\u70b9\u51fb\u201c\u5bfc\u51fa JSON \u65e5\u5fd7\u201d\uff0c\u5373\u53ef\u76f4\u63a5\u53d1\u9001\u6587\u4ef6\u3002'
        : `\u5df2\u5c1d\u8bd5 JSON \u548c TXT \u4e24\u79cd\u6587\u4ef6\u683c\u5f0f\u3002\u8bf7\u66f4\u65b0\u5fae\u4fe1\u540e\u5728\u771f\u673a\u91cd\u8bd5\u3002${errorMessage ? `\n\n\u9519\u8bef\uff1a${errorMessage}` : ''}`,
      showCancel: false,
      confirmText: '\u77e5\u9053\u4e86',
      confirmColor: '#2D5A27'
    });
  },

  sharePreparedDebugLogFile(format = 'json') {
    if (this.data.debugLogExporting) return;
    const preparedFiles = this._preparedDebugLogFiles || {};
    const file = preparedFiles[format];
    if (!file) {
      wx.showToast({ title: '\u65e5\u5fd7\u6587\u4ef6\u5c1a\u672a\u51c6\u5907\u597d', icon: 'none' });
      return;
    }
    this.setData({ debugLogExporting: true });
    // This call must remain synchronous with the user tap. Any await before
    // shareFileMessage makes WeChat reject it as a non-user gesture.
    const sharePromise = debugLogExport.shareDebugLogFile(file);
    sharePromise.then((result) => {
      if (result.shared) return;
      if (result.reason === 'cancelled') {
        wx.showToast({ title: '\u5df2\u53d6\u6d88\u5bfc\u51fa', icon: 'none' });
        return;
      }
      const errorMessage = result.error && result.error.errMsg
        ? String(result.error.errMsg)
        : '';
      const platform = debugLogExport.getRuntimePlatform();
      if (format === 'json' && platform !== 'devtools') {
        wx.showModal({
          title: '\u6539\u7528 TXT \u6587\u4ef6\u5206\u4eab\uff1f',
          content: `JSON \u6587\u4ef6\u672a\u80fd\u8c03\u8d77\u5206\u4eab\u3002\u70b9\u51fb\u201c\u5206\u4eab TXT\u201d\u540e\u4f1a\u7acb\u5373\u518d\u8bd5\uff0c\u6587\u4ef6\u5185\u5bb9\u4ecd\u662f\u5b8c\u6574 JSON\u3002${errorMessage ? `\n\n\u9519\u8bef\uff1a${errorMessage}` : ''}`,
          confirmText: '\u5206\u4eab TXT',
          cancelText: '\u53d6\u6d88',
          confirmColor: '#2D5A27',
          success: (modalResult) => {
            if (modalResult.confirm) this.sharePreparedDebugLogFile('txt');
          }
        });
        return;
      }
      this.showDebugLogShareUnavailable({
        ...result,
        platform,
        format,
        attempts: [{ format, ...result }]
      });
    }).catch((error) => {
      runtimeErrors.recordRuntimeError('debug_log_export_failed', error);
      wx.showToast({ title: '\u65e5\u5fd7\u6587\u4ef6\u5206\u4eab\u5931\u8d25', icon: 'none' });
    }).finally(() => {
      this.setData({ debugLogExporting: false });
    });
  },

  exportDebugLogFile() {
    this.sharePreparedDebugLogFile('json');
  },

  async legacyExportDebugLogFile() {
    if (this.data.debugLogExporting) return;
    this.setData({ debugLogExporting: true });
    try {
      runtimeErrors.flushEvents();
      const latestLog = await this.buildCurrentDebugLog();
      this.setData({ debugLogText: latestLog });
      const result = await debugLogExport.exportDebugLog(latestLog);
      if (result.shared) return;
      if (result.reason === 'cancelled') {
        wx.showToast({ title: '已取消导出', icon: 'none' });
        return;
      }
      this.showDebugLogShareUnavailable(result);
    } catch (error) {
      runtimeErrors.recordRuntimeError('debug_log_export_failed', error);
      wx.showToast({ title: '日志文件生成失败', icon: 'none' });
    } finally {
      this.setData({ debugLogExporting: false });
    }
  },

  confirmClearLocalData() {
    this.setData({
      showClearDataShell: true,
      clearDataStep: 1,
      clearConfirmPhrase: '',
      clearDataAlsoLogout: false
    });
  },

  closeClearDataShell() {
    this.setData({ showClearDataShell: false, clearDataStep: 1, clearConfirmPhrase: '' });
  },

  goToClearDataStepTwo() {
    this.setData({ clearDataStep: 2, clearConfirmPhrase: '' });
  },

  onClearConfirmPhraseInput(event) {
    this.setData({ clearConfirmPhrase: event.detail.value });
  },

  validateClearConfirmPhrase() {
    if (String(this.data.clearConfirmPhrase || '').trim() !== '确认删除') {
      wx.showToast({ title: '确认词输入错误', icon: 'none' });
      return;
    }
    this.setData({ clearDataStep: 3 });
  },

  async completeClearLocalData() {
    const shouldLogout = Boolean(this.data.clearDataAlsoLogout);
    dataCapsule.clearLocalData();
    if (shouldLogout) {
      try {
        await auth.signOut();
      } catch (error) {
        // 远端退出失败时仍完成本地退出。
      }
      wx.removeStorageSync('weapp_account_mode_enabled');
      wx.setStorageSync('weapp_guest_mode_enabled', true);
      getApp().globalData.dataMode = 'guest';
    }
    if (dataRepository.getMode() === 'guest') localData.ensureTutorialRecord();
    this.setData({
      showClearDataShell: false,
      clearDataStep: 1,
      clearConfirmPhrase: '',
      clearDataAlsoLogout: false
    });
    await this.loadPage();
    wx.showToast({ title: '本地数据已清空', icon: 'success' });
  },

  openLogin(event) {
    const mode = event && event.detail && event.detail.mode
      ? event.detail.mode
      : event && event.currentTarget && event.currentTarget.dataset.mode
        ? event.currentTarget.dataset.mode
        : 'login';
    this.setData({ showAuthModal: true, authInitialMode: mode });
  },

  closeAuthModal() {
    this.setData({ showAuthModal: false });
  },

  async onAuthSuccess() {
    this.setData({ showAuthModal: false, activeSettingsTab: 'account' });
    await this.offerGuestMerge();
    await this.loadPage();
    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  async offerGuestMerge() {
    const summary = dataRepository.getGuestMergeSummary();
    if (!summary.eligible) return;
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '合并本机练习数据？',
        content: `检测到本机有 ${summary.counts.records} 条练习记录${summary.counts.photos ? `、${summary.counts.photos} 张照片` : ''}。合并后会保留账号原有数据，并把本机数据上传到同一账号。`,
        confirmText: '合并数据',
        cancelText: '暂不合并',
        success: (result) => resolve(Boolean(result.confirm)),
        fail: () => resolve(false)
      });
    });
    if (!confirmed) {
      dataRepository.dismissGuestMerge();
      return;
    }
    wx.showLoading({ title: '合并数据中' });
    try {
      const result = await dataRepository.migrateGuestDataToAccount();
      wx.showToast({
        title: result.pending ? `已加入同步，待处理 ${result.pending} 项` : '本机数据已合并',
        icon: result.pending ? 'none' : 'success'
      });
    } catch (error) {
      wx.showToast({ title: error && error.message ? error.message : '本机数据合并失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async syncAccountRecords() {
    if (this.data.syncStatus === 'syncing') return;
    this.setData({ syncStatus: 'syncing' });
    const result = await dataRepository.syncPendingRecords({ includePhotos: true });
    dataRepository.invalidateSharedReads();
    await this.loadPage();
    const completed = result.pending === 0;
    this.setData({
      syncStatus: completed ? 'success' : 'error',
      pendingSyncCount: result.pending
    });
    wx.showToast({
      title: completed ? `同步完成${result.synced ? ` ${result.synced} 项` : ''}` : `还有 ${result.pending} 项待同步`,
      icon: completed ? 'success' : 'none'
    });
  },

  resetSyncStatus() {
    const state = dataRepository.getRecordSyncState();
    this.setData({
      syncStatus: state.pending > 0 ? 'error' : 'idle',
      pendingSyncCount: state.pending
    });
    wx.showToast({ title: state.pending > 0 ? '已保留待同步数据' : '同步状态已重置', icon: 'none' });
  },

  setTabBarHidden(hidden) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden });
    }
  },

  async logout() {
    this.setData({ submitLoading: true });
    try {
      await auth.signOut();
    } catch (error) {
      // 远端退出失败时仍清理本地会话。
    } finally {
      this.setData({ submitLoading: false, showLogoutShell: false, settingsOpen: false });
      wx.removeStorageSync('weapp_account_mode_enabled');
      wx.setStorageSync('weapp_guest_mode_enabled', true);
      getApp().globalData.dataMode = 'guest';
      localData.ensureTutorialRecord();
      this.setTabBarHidden(false);
      wx.switchTab({ url: '/pages/practice/practice' });
    }
  }
});
