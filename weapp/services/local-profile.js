const PROFILE_KEY = 'weapp_guest_profile_v1';

const DEFAULT_PROFILE = {
  name: '阿斯汤加习练者',
  signature: '练习、练习，一切随之而来。',
  avatar: '',
  historical_days: 0,
  historical_avg_minutes: 0
};

function toNonNegativeInteger(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
}

function normalizeProfile(input = {}) {
  return {
    name: String(input.name || DEFAULT_PROFILE.name).trim() || DEFAULT_PROFILE.name,
    signature: String(input.signature || DEFAULT_PROFILE.signature).trim() || DEFAULT_PROFILE.signature,
    avatar: String(input.avatar || ''),
    historical_days: toNonNegativeInteger(input.historical_days),
    historical_avg_minutes: toNonNegativeInteger(input.historical_avg_minutes),
    updated_at: input.updated_at || ''
  };
}

function getProfile() {
  const stored = wx.getStorageSync(PROFILE_KEY);
  return normalizeProfile({
    ...DEFAULT_PROFILE,
    ...(stored && typeof stored === 'object' ? stored : {})
  });
}

function saveProfile(input) {
  const current = getProfile();
  const next = normalizeProfile({
    ...current,
    ...input,
    updated_at: new Date().toISOString()
  });
  wx.setStorageSync(PROFILE_KEY, next);
  return next;
}

function resetProfile() {
  const next = normalizeProfile({
    ...DEFAULT_PROFILE,
    updated_at: new Date().toISOString()
  });
  wx.setStorageSync(PROFILE_KEY, next);
  return next;
}

module.exports = {
  PROFILE_KEY,
  DEFAULT_PROFILE,
  getProfile,
  saveProfile,
  resetProfile
};
