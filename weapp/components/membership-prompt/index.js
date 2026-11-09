const REASON_SUBTITLES = Object.freeze({
  options_full: '免费用户最多 3 个练习选项',
  locked_option: '开通 Pro 可继续使用更多选项',
  locked_practice: '开通 Pro 可使用该练习选项',
  locked_annotation: '免费用户 1 种标注，Pro 最多 9 种',
  color_level: 'Pro 可解锁全部日历颜色',
  photo_count: '免费用户每条记录最多 1 张照片',
  photo_size: '免费用户单张照片最大 5 MB',
  chant_delay: '开通 Pro 可自定义唱诵倒计时'
});

const BENEFITS = Object.freeze([
  { feature: '每条记录照片', free: '1 张', pro: '9 张' },
  { feature: '单张照片大小', free: '5 MB', pro: '30 MB' },
  { feature: '练习选项', free: '3 个', pro: '11 个' },
  { feature: '日历标注', free: '1 种', pro: '9 种' },
  { feature: '日历颜色', free: '1 种', pro: '4 种' },
  { feature: '唱诵倒计时', free: '1 分钟', pro: '自定义' }
]);

Component({
  properties: {
    show: { type: Boolean, value: false },
    reason: { type: String, value: 'options_full' }
  },

  data: {
    benefits: BENEFITS,
    subtitle: REASON_SUBTITLES.options_full
  },

  observers: {
    reason(reason) {
      this.setData({
        subtitle: REASON_SUBTITLES[reason] || '解锁更多记录与日历能力'
      });
    }
  },

  methods: {
    stopPropagation() {},
    close() {
      this.triggerEvent('close');
    },
    upgrade() {
      this.triggerEvent('upgrade');
    }
  }
});
