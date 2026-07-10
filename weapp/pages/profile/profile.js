const auth = require('../../services/auth');
const dataRepository = require('../../services/data-repository');

Page({
  data: {
    loading: true,
    submitLoading: false,
    userEmail: '',
    isLoggedIn: false,
    guestRecordCount: 0
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadPage();
  },

  async loadPage() {
    this.setData({ loading: true });
    let user = null;
    try {
      user = wx.getStorageSync('weapp_account_mode_enabled')
        ? await auth.getCurrentUser()
        : null;
    } catch (error) {
      user = null;
    }
    this.setData({
      loading: false,
      isLoggedIn: Boolean(user),
      userEmail: user && user.email ? user.email : '',
      guestRecordCount: dataRepository.getGuestRecordCount()
    });
  },

  openLogin() {
    wx.removeStorageSync('weapp_guest_mode_enabled');
    wx.setStorageSync('weapp_account_mode_enabled', true);
    wx.reLaunch({ url: '/pages/index/index?account=1' });
  },

  async logout() {
    this.setData({ submitLoading: true });
    try {
      await auth.signOut();
    } catch (error) {
      // 远端退出失败时 auth.signOut 仍会清理本地会话。
    } finally {
      this.setData({ submitLoading: false });
      wx.removeStorageSync('weapp_account_mode_enabled');
      wx.setStorageSync('weapp_guest_mode_enabled', true);
      getApp().globalData.dataMode = 'guest';
      wx.switchTab({ url: '/pages/practice/practice' });
    }
  }
});
