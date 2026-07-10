const { privacyPolicy } = require('../../content/agreements');

Page({
  data: {
    agreement: privacyPolicy
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '隐私协议'
    });
  }
});
