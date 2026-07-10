const STORAGE_KEY = 'has_seen_landing';

Page({
  data: {
    isNavigating: false
  },

  onLoad() {
    if (wx.getStorageSync(STORAGE_KEY)) {
      wx.switchTab({
        url: '/pages/practice/practice'
      });
    }
  },

  onStartPractice() {
    wx.setStorageSync(STORAGE_KEY, true);
    this.setData({ isNavigating: true });
    wx.switchTab({
      url: '/pages/practice/practice'
    });
  }
});
