const { POSE_SECTIONS, POSES } = require('../../services/pose-data');

const NAV_ITEMS = [
  {
    index: 0,
    pagePath: '/pages/practice/practice',
    text: '今日练习',
    icon: '/images/icons/tab-calendar.png'
  },
  {
    index: 1,
    pagePath: '/pages/journal/journal',
    text: '觉察日记',
    icon: '/images/icons/tab-bookOpen.png'
  },
  {
    index: 2,
    pagePath: '/pose-package/pages/poses/poses',
    text: '体式库',
    icon: '/images/icons/tab-library-selected.png'
  },
  {
    index: 3,
    pagePath: '/pages/profile/profile',
    text: '我的数据',
    icon: '/images/icons/tab-user.png'
  }
];

function createDetailSteps(pose) {
  const source = pose.vinyasaSteps || (pose.action ? [{
    count: pose.vinyasaStep || '—',
    breath: pose.breath || '—',
    action: pose.action,
    drishti: pose.drishti,
    isAsana: false,
    holdBreaths: pose.holdBreaths
  }] : []);

  return source.map((step, index) => ({
    ...step,
    key: `${step.count}-${index}`,
    displayCount: step.count === '—' ? '-' : `V${step.count}`,
    cardClass: step.isAsana ? 'asana' : ''
  }));
}

Page({
  data: {
    sections: POSE_SECTIONS,
    activeSection: 'surya-a',
    visiblePoses: POSES.filter((pose) => pose.section === 'surya-a'),
    selectedPose: null,
    poseIndex: 0,
    detailSteps: [],
    detailHasAsana: false,
    detailImageLoaded: false,
    navItems: NAV_ITEMS
  },

  onShow() {
    wx.setNavigationBarTitle({ title: '体式库' });
  },

  switchSection(event) {
    const section = event.currentTarget.dataset.section;
    if (!section || section === this.data.activeSection) return;
    this.setData({
      activeSection: section,
      visiblePoses: POSES.filter((pose) => pose.section === section)
    });
  },

  openPose(event) {
    const id = event.currentTarget.dataset.id;
    const poseIndex = this.data.visiblePoses.findIndex((pose) => pose.id === id);
    if (poseIndex < 0) return;
    this.showPose(this.data.visiblePoses[poseIndex], poseIndex);
  },

  showPose(pose, poseIndex) {
    const detailSteps = createDetailSteps(pose);
    this.setData({
      selectedPose: pose,
      poseIndex,
      detailSteps,
      detailHasAsana: detailSteps.some((step) => step.isAsana),
      detailImageLoaded: false
    });
  },

  closePose() {
    this.setData({
      selectedPose: null,
      detailSteps: [],
      detailHasAsana: false,
      detailImageLoaded: false
    });
  },

  onDetailImageLoad() {
    this.setData({ detailImageLoaded: true });
  },

  navigatePose(event) {
    const direction = event.currentTarget.dataset.direction;
    const count = this.data.visiblePoses.length;
    if (!count) return;
    const poseIndex = direction === 'prev'
      ? (this.data.poseIndex - 1 + count) % count
      : (this.data.poseIndex + 1) % count;
    this.showPose(this.data.visiblePoses[poseIndex], poseIndex);
  },

  switchAppTab(event) {
    const index = Number(event.currentTarget.dataset.index);
    const pagePath = event.currentTarget.dataset.path;
    if (index === 2 || !pagePath) return;
    wx.switchTab({ url: pagePath });
  }
});
