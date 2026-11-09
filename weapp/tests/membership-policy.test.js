const test = require('node:test');
const assert = require('node:assert/strict');

const policy = require('../services/membership-policy');

test('FREE 与 PRO 六项能力来自唯一策略表', () => {
  assert.deepEqual(policy.FREE.allowedColorLevels, [3]);
  assert.equal(policy.FREE.maxPhotosPerRecord, 1);
  assert.equal(policy.FREE.maxPhotoMB, 5);
  assert.equal(policy.FREE.maxPracticeOptions, 3);
  assert.equal(policy.FREE.maxAnnotationTypes, 1);
  assert.equal(policy.FREE.canCustomizeChantDelay, false);

  assert.deepEqual(policy.PRO.allowedColorLevels, [1, 2, 3, 4]);
  assert.equal(policy.PRO.maxPhotosPerRecord, 9);
  assert.equal(policy.PRO.maxPhotoMB, 30);
  assert.equal(policy.PRO.maxPracticeOptions, 11);
  assert.equal(policy.PRO.maxAnnotationTypes, 9);
  assert.equal(policy.PRO.canCustomizeChantDelay, true);
});

test('免费用户所有非第 3 色阶都会回退为第 3 色阶', () => {
  assert.equal(policy.normalizeColorLevel(1, false), 3);
  assert.equal(policy.normalizeColorLevel(2, false), 3);
  assert.equal(policy.normalizeColorLevel(3, false), 3);
  assert.equal(policy.normalizeColorLevel(4, false), 3);
  assert.equal(policy.normalizeColorLevel(2, true), 2);
});

test('免费唱诵固定 60 秒，Pro 可在 5 秒到 180 分钟内自定义', () => {
  assert.equal(policy.clampChantDelay(15, false), 60);
  assert.equal(policy.clampChantDelay(2, true), 5);
  assert.equal(policy.clampChantDelay(90, true), 90);
  assert.equal(policy.clampChantDelay(999999, true), 10800);
});

test('已过期会员按 FREE 处理', () => {
  assert.equal(policy.isActiveMembership({
    is_active: true,
    expires_at: '2020-01-01T00:00:00.000Z'
  }), false);
  assert.equal(policy.getCapabilities({ is_active: false }).tier, 'free');
  assert.equal(policy.getCapabilities({ is_active: true, expires_at: null }).tier, 'pro');
});
