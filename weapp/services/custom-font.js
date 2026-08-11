const FONT_FAMILY = 'Ashtanga Serif';
const FONT_VERSION = '20260811-1';
const FONT_URL = `https://ash.ashtangalife.online/fonts/ashtanga-noto-serif-sc-ui-v2.woff?v=${FONT_VERSION}`;

let loadStarted = false;

function loadGlobalFont() {
  if (loadStarted || typeof wx === 'undefined' || typeof wx.loadFontFace !== 'function') {
    return;
  }

  loadStarted = true;
  wx.loadFontFace({
    global: true,
    family: FONT_FAMILY,
    source: `url("${FONT_URL}")`,
    desc: {
      style: 'normal',
      weight: 'normal'
    },
    fail(error) {
      loadStarted = false;
      console.warn('Noto Serif SC 字体加载失败，将使用系统字体', error);
    }
  });
}

module.exports = {
  FONT_FAMILY,
  FONT_VERSION,
  FONT_URL,
  loadGlobalFont
};
