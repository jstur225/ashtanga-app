const test = require('node:test');
const assert = require('node:assert/strict');

const { MOON_DAYS, getMoonType, getMoonIcon } = require('../services/moon-days');

test('月相数据统一覆盖 2026 和 2027，并按北京时间日期返回', () => {
  assert.equal(getMoonType('2026-05-02'), 'full');
  assert.equal(getMoonType('2026-05-17'), 'new');
  assert.equal(getMoonType('2027-02-21'), 'full');
  assert.equal(getMoonType('2027-04-07'), 'new');
  assert.equal(getMoonType('2027-09-30'), 'new');
  assert.equal(getMoonType('2028-01-01'), '');
  assert.ok(Object.keys(MOON_DAYS).some((date) => date.startsWith('2026-')));
  assert.ok(Object.keys(MOON_DAYS).some((date) => date.startsWith('2027-')));
});

test('月相图标只使用小程序包内素材', () => {
  assert.equal(getMoonIcon('2027-01-08'), '/images/moon-phase/new-moon.png');
  assert.equal(getMoonIcon('2027-01-22'), '/images/moon-phase/full-moon.png');
  assert.equal(getMoonIcon('2027-01-09'), '');
});
