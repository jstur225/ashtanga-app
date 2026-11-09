const FREE = Object.freeze({
  tier: 'free',
  maxPhotosPerRecord: 1,
  maxPhotoBytes: 5 * 1024 * 1024,
  maxPhotoMB: 5,
  maxPracticeOptions: 3,
  maxAnnotationTypes: 1,
  allowedColorLevels: Object.freeze([3]),
  canCustomizeChantDelay: false,
  defaultChantDelaySeconds: 60,
  minChantDelaySeconds: 60,
  maxChantDelaySeconds: 60
});

const PRO = Object.freeze({
  tier: 'pro',
  maxPhotosPerRecord: 9,
  maxPhotoBytes: 30 * 1024 * 1024,
  maxPhotoMB: 30,
  maxPracticeOptions: 11,
  maxAnnotationTypes: 9,
  allowedColorLevels: Object.freeze([1, 2, 3, 4]),
  canCustomizeChantDelay: true,
  defaultChantDelaySeconds: 60,
  minChantDelaySeconds: 5,
  maxChantDelaySeconds: 180 * 60
});

const REASON_MESSAGES = Object.freeze({
  options_full: '免费用户最多使用 3 个练习选项，Pro 最多 11 个',
  locked_option: '这个练习选项属于 Pro 会员权益',
  locked_annotation: '免费用户可使用 1 种日历标注，Pro 最多 9 种',
  color_level: '免费用户使用默认第 3 色阶，Pro 可使用全部 4 种日历颜色',
  photo_account: '绑定邮箱账号后才能使用照片功能',
  photo_count: '免费用户每条记录可添加 1 张照片，Pro 可添加 9 张',
  photo_size: '免费用户单张照片最大 5MB，Pro 最大 30MB',
  chant_delay: '免费用户唱诵倒计时固定 1 分钟，Pro 可自定义时长'
});

function isActiveMembership(status) {
  if (!status || !status.is_active) return false;
  if (!status.expires_at) return true;
  const expiresAt = Date.parse(status.expires_at);
  return !Number.isFinite(expiresAt) || expiresAt > Date.now();
}

function getCapabilities(statusOrIsPro) {
  const isPro = typeof statusOrIsPro === 'boolean'
    ? statusOrIsPro
    : isActiveMembership(statusOrIsPro);
  return isPro ? PRO : FREE;
}

function isColorLevelAllowed(level, statusOrIsPro) {
  return getCapabilities(statusOrIsPro).allowedColorLevels.includes(Number(level));
}

function normalizeColorLevel(level, statusOrIsPro) {
  const numeric = Math.min(4, Math.max(1, Number(level) || 3));
  return isColorLevelAllowed(numeric, statusOrIsPro) ? numeric : 3;
}

function buildColorLevelOptions(statusOrIsPro) {
  return [1, 2, 3, 4].map((level) => ({
    level,
    locked: !isColorLevelAllowed(level, statusOrIsPro)
  }));
}

function clampChantDelay(seconds, statusOrIsPro) {
  const capabilities = getCapabilities(statusOrIsPro);
  if (!capabilities.canCustomizeChantDelay) return capabilities.defaultChantDelaySeconds;
  return Math.min(
    capabilities.maxChantDelaySeconds,
    Math.max(capabilities.minChantDelaySeconds, Number(seconds) || capabilities.defaultChantDelaySeconds)
  );
}

function getReasonMessage(reason) {
  return REASON_MESSAGES[reason] || '该功能需要 Pro 会员';
}

module.exports = {
  FREE,
  PRO,
  REASON_MESSAGES,
  isActiveMembership,
  getCapabilities,
  isColorLevelAllowed,
  normalizeColorLevel,
  buildColorLevelOptions,
  clampChantDelay,
  getReasonMessage
};
