const PRACTICE_PAGE_PATH = '/pages/practice/practice';
const SHARE_TITLE = '熬汤日记｜从今天的练习开始';
const FRIEND_SHARE_IMAGE_URL = '/images/share-practice-final.jpg';
const TIMELINE_SHARE_IMAGE_URL = '/images/icon-green.png';
const TIMELINE_QUERY = 'shareTarget=practice';

function showShareMenu() {
  if (typeof wx === 'undefined' || typeof wx.showShareMenu !== 'function') return;
  wx.showShareMenu({
    menus: ['shareAppMessage', 'shareTimeline']
  });
}

function redirectTimelineEntryToPractice(options = {}) {
  if (!options || options.shareTarget !== 'practice') return false;
  if (typeof wx === 'undefined' || typeof wx.switchTab !== 'function') return false;
  wx.switchTab({ url: PRACTICE_PAGE_PATH });
  return true;
}

const pageShareHandlers = {
  onShareAppMessage() {
    return {
      title: SHARE_TITLE,
      path: PRACTICE_PAGE_PATH,
      imageUrl: FRIEND_SHARE_IMAGE_URL
    };
  },

  onShareTimeline() {
    return {
      title: SHARE_TITLE,
      query: TIMELINE_QUERY,
      imageUrl: TIMELINE_SHARE_IMAGE_URL
    };
  }
};

module.exports = {
  PRACTICE_PAGE_PATH,
  SHARE_TITLE,
  FRIEND_SHARE_IMAGE_URL,
  TIMELINE_SHARE_IMAGE_URL,
  TIMELINE_QUERY,
  showShareMenu,
  redirectTimelineEntryToPractice,
  pageShareHandlers
};
