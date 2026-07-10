const STORAGE_KEY = 'has_seen_landing';

Page({
  data: {
    isNavigating: false,
    ampersand: '&',
    icons: {
      arrowRight: '/images/icons/landing-arrowRight.png',
      loader: '/images/icons/landing-loader.png',
      leaf: '/images/icons/landing-leaf.png',
      chevronDown: '/images/icons/landing-chevronDown.png',
      timer: '/images/icons/landing-timer.png',
      bookOpen: '/images/icons/landing-bookOpen.png',
      barChart3: '/images/icons/landing-barChart3.png',
      moon: '/images/icons/landing-moon.png',
      wind: '/images/icons/landing-wind.png',
      shield: '/images/icons/landing-shield.png',
      coffee: '/images/icons/landing-coffee.png',
      github: '/images/icons/landing-github.png'
    }
  },

  onLoad() {
    if (wx.getStorageSync(STORAGE_KEY)) {
      wx.switchTab({
        url: '/pages/practice/practice'
      });
    }
  },

  onStartPractice() {
    if (this.data.isNavigating) return;
    wx.setStorageSync(STORAGE_KEY, true);
    this.setData({ isNavigating: true });
    wx.switchTab({
      url: '/pages/practice/practice'
    });
  }
});
