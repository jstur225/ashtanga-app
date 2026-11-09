const { privacyPolicy } = require('../../content/agreements');
const practiceShare = require('../../utils/practice-share');

Page({
  ...practiceShare.pageShareHandlers,

  data: {
    agreement: privacyPolicy
  },

  onLoad(options = {}) {
    practiceShare.showShareMenu();
    practiceShare.redirectTimelineEntryToPractice(options);
    wx.setNavigationBarTitle({
      title: '隐私协议'
    });
  }
});
