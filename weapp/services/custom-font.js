const FONT_FAMILY = 'Ashtanga Serif';
const FONT_VERSION = '20260811-1';
const FONT_URL = `https://ash.ashtangalife.online/fonts/ashtanga-noto-serif-sc-ui-v2.woff?v=${FONT_VERSION}`;
const FONT_FAILURE_KEY = 'ashtanga_font_failure_v1';
const FONT_RETRY_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const runtimeErrors = require('./runtime-errors');

let loadStarted = false;

function loadGlobalFont() {
  if (loadStarted || typeof wx === 'undefined' || typeof wx.loadFontFace !== 'function') {
    return;
  }

  const previousFailure = typeof wx.getStorageSync === 'function'
    ? wx.getStorageSync(FONT_FAILURE_KEY)
    : null;
  if (previousFailure && previousFailure.version === FONT_VERSION &&
    Date.now() - Number(previousFailure.failed_at || 0) < FONT_RETRY_COOLDOWN_MS) {
    runtimeErrors.recordEvent('asset', 'font_load_skipped', {
      version: FONT_VERSION,
      reason: 'failure_cooldown'
    });
    return;
  }

  loadStarted = true;
  const trace = runtimeErrors.startTrace('asset', 'font_load', { version: FONT_VERSION });
  wx.loadFontFace({
    global: true,
    family: FONT_FAMILY,
    source: `url("${FONT_URL}")`,
    desc: {
      style: 'normal',
      weight: 'normal'
    },
    success() {
      if (typeof wx.removeStorageSync === 'function') wx.removeStorageSync(FONT_FAILURE_KEY);
      runtimeErrors.finishTrace(trace, 'success');
    },
    fail(error) {
      loadStarted = false;
      if (typeof wx.setStorageSync === 'function') {
        wx.setStorageSync(FONT_FAILURE_KEY, {
          version: FONT_VERSION,
          failed_at: Date.now()
        });
      }
      runtimeErrors.finishTrace(trace, 'error', { message: error && error.errMsg });
      console.warn('Noto Serif SC 字体加载失败，将使用系统字体', error);
    }
  });
}

module.exports = {
  FONT_FAMILY,
  FONT_VERSION,
  FONT_URL,
  FONT_FAILURE_KEY,
  FONT_RETRY_COOLDOWN_MS,
  loadGlobalFont
};
