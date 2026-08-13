const WECHAT_ID = 'xiao519216978';

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    wechatId: WECHAT_ID,
    copiedWx: false
  },

  methods: {
    onClose() {
      this.setData({ copiedWx: false });
      this.triggerEvent('close');
    },

    copyWx() {
      wx.setClipboardData({
        data: WECHAT_ID,
        success: () => {
          this.setData({ copiedWx: true });
          wx.showToast({ title: '微信号已复制', icon: 'success' });
          setTimeout(() => this.setData({ copiedWx: false }), 2000);
        }
      });
    },

    stopPropagation() {}
  }
});
