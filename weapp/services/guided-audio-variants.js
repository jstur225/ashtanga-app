const GUIDED_AUDIO_VARIANT_STORAGE_KEY = 'ashtanga_guided_audio_variant';
const AUDIO_BASE_URL = 'https://ash.ashtangalife.online/audio';

const GUIDED_AUDIO_VARIANTS = [
  {
    id: 'guruji-led-primary',
    teacher: '老掌门人',
    note: '老掌门人版口令',
    durationLabel: '88:06',
    audioUrl: `${AUDIO_BASE_URL}/guruji-led-primary.m4a?v=20260720`,
    cacheKey: 'guruji-led-primary',
    cacheVersion: '20260720-v1',
    minValidBytes: 40 * 1024 * 1024
  },
  {
    id: 'sharath-jois-led-primary',
    teacher: 'Sharath Jois',
    note: 'Sharath Jois版口令',
    durationLabel: '89:41',
    audioUrl: `${AUDIO_BASE_URL}/sharath-jois-led-primary-v1.m4a?v=20260904`,
    cacheKey: 'sharath-jois-led-primary',
    cacheVersion: '20260904-v2',
    minValidBytes: 30 * 1024 * 1024,
    sourceUrl: 'https://www.youtube.com/watch?v=0KMbO52LLqk'
  }
];

const DEFAULT_GUIDED_AUDIO_VARIANT = GUIDED_AUDIO_VARIANTS[0];

function getGuidedAudioVariant(id) {
  return GUIDED_AUDIO_VARIANTS.find((variant) => variant.id === id)
    || DEFAULT_GUIDED_AUDIO_VARIANT;
}

function getStoredGuidedAudioVariant() {
  try {
    return getGuidedAudioVariant(wx.getStorageSync(GUIDED_AUDIO_VARIANT_STORAGE_KEY));
  } catch (_error) {
    return DEFAULT_GUIDED_AUDIO_VARIANT;
  }
}

function storeGuidedAudioVariant(id) {
  const variant = getGuidedAudioVariant(id);
  try {
    wx.setStorageSync(GUIDED_AUDIO_VARIANT_STORAGE_KEY, variant.id);
  } catch (_error) {
    // 选择仍在当前页面生效；持久化失败不阻止播放。
  }
  return variant;
}

module.exports = {
  GUIDED_AUDIO_VARIANT_STORAGE_KEY,
  GUIDED_AUDIO_VARIANTS,
  DEFAULT_GUIDED_AUDIO_VARIANT,
  getGuidedAudioVariant,
  getStoredGuidedAudioVariant,
  storeGuidedAudioVariant
};
