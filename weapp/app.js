App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    dataMode: 'guest'
  },

  onLaunch() {
    console.log('熬汤日记小程序启动');
    const auth = require('./services/auth');
    const guestModeEnabled = wx.getStorageSync('weapp_guest_mode_enabled');
    const accountModeEnabled = wx.getStorageSync('weapp_account_mode_enabled');
    const session = auth.getStoredSession();
    this.globalData.isLoggedIn = Boolean(session) && accountModeEnabled && !guestModeEnabled;
    this.globalData.userInfo = this.globalData.isLoggedIn ? session.user : null;
    this.globalData.dataMode = this.globalData.isLoggedIn ? 'cloud' : 'guest';
  }
});
