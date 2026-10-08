const runtimeErrors = require('./services/runtime-errors');
const customFont = require('./services/custom-font');

let startupEnhancementTimer = null;

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    dataMode: 'guest'
  },

  onLaunch(options = {}) {
    runtimeErrors.startSession(options);
    runtimeErrors.installGlobalErrorHandlers();
    console.log('熬汤日记小程序启动');
    const auth = require('./services/auth');
    const guestModeEnabled = wx.getStorageSync('weapp_guest_mode_enabled');
    const accountModeEnabled = wx.getStorageSync('weapp_account_mode_enabled');
    const session = auth.getStoredSession();
    this.globalData.isLoggedIn = Boolean(session) && accountModeEnabled && !guestModeEnabled;
    this.globalData.userInfo = this.globalData.isLoggedIn ? session.user : null;
    this.globalData.dataMode = this.globalData.isLoggedIn ? 'cloud' : 'guest';
    runtimeErrors.recordEvent('lifecycle', 'app_mode_resolved', {
      mode: this.globalData.dataMode,
      is_logged_in: this.globalData.isLoggedIn,
      has_stored_session: Boolean(session)
    });
    if (!this.globalData.isLoggedIn) {
      require('./services/local-data').ensureTutorialRecord();
    }
  },

  onShow(options = {}) {
    const auth = require('./services/auth');
    const session = auth.getStoredSession();
    const guestModeEnabled = wx.getStorageSync('weapp_guest_mode_enabled');
    const accountModeEnabled = wx.getStorageSync('weapp_account_mode_enabled');
    runtimeErrors.recordEvent('lifecycle', 'app_show', {
      scene: options.scene,
      mode: session && accountModeEnabled && !guestModeEnabled ? 'cloud' : 'guest'
    });
    if (startupEnhancementTimer) clearTimeout(startupEnhancementTimer);
    startupEnhancementTimer = setTimeout(() => {
      startupEnhancementTimer = null;
      customFont.loadGlobalFont();
      if (!session || !accountModeEnabled || guestModeEnabled) return;
      const recoveryTrace = runtimeErrors.startTrace('payment', 'startup_order_recovery', {
        max_orders: 1,
        max_age_minutes: 30
      });
      require('./services/payment').recoverPendingOrders({
        maxOrders: 1,
        maxAgeMs: 30 * 60 * 1000
      }).then((result) => {
        runtimeErrors.finishTrace(recoveryTrace, result && result.errors ? 'warning' : 'success', result || {});
        if (result && result.recovered > 0) {
          wx.showToast({ title: '会员已到账', icon: 'success' });
        }
      }).catch((error) => {
        runtimeErrors.finishTrace(recoveryTrace, 'error', { message: error && error.message });
        console.warn('[PaymentRecovery] pending order recovery failed', error);
      });
    }, 800);
  },

  onHide() {
    runtimeErrors.recordEvent('lifecycle', 'app_hide');
    runtimeErrors.flushEvents();
    if (startupEnhancementTimer) {
      clearTimeout(startupEnhancementTimer);
      startupEnhancementTimer = null;
    }
  }
});
