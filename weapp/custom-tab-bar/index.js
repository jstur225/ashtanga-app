Component({
  data: {
    selected: 0,
    hidden: false,
    items: [
      {
        pagePath: '/pages/practice/practice',
        text: '今日练习',
        icon: '/images/icons/tab-calendar.png',
        iconSelected: '/images/icons/tab-calendar-selected.png'
      },
      {
        pagePath: '/pages/journal/journal',
        text: '觉察日记',
        icon: '/images/icons/tab-bookOpen.png',
        iconSelected: '/images/icons/tab-bookOpen-selected.png'
      },
      {
        pagePath: '/pose-package/pages/poses/poses',
        text: '体式库',
        icon: '/images/icons/tab-library.png',
        iconSelected: '/images/icons/tab-library-selected.png',
        navigation: 'navigateTo'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的数据',
        icon: '/images/icons/tab-user.png',
        iconSelected: '/images/icons/tab-user-selected.png'
      }
    ]
  },

  methods: {
    switchTab(event) {
      const { index, path } = event.currentTarget.dataset;
      if (Number(index) === this.data.selected) {
        return;
      }
      this.setData({ selected: Number(index) });
      if (path === '/pose-package/pages/poses/poses') {
        wx.navigateTo({ url: path });
        return;
      }
      wx.switchTab({ url: path });
    }
  }
});
