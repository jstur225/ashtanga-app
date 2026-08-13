const test = require('node:test');
const assert = require('node:assert/strict');

const { BLOCKED_WORDS, findBlockedWord, checkText } = require('../services/content-filter');

test('checkText 命中色情/赌博词', () => {
  assert.deepEqual(checkText('今天练完想去赌博'), { ok: false, word: '赌博' });
  assert.deepEqual(checkText('群里在发六合彩信息'), { ok: false, word: '六合彩' });
});

test('英文词命中且大小写不敏感', () => {
  assert.deepEqual(checkText('watch PORN online'), { ok: false, word: 'porn' });
  assert.equal(findBlockedWord('Casino night'), 'casino');
});

test('正常练习日记不误伤', () => {
  assert.equal(checkText('今日练习完成，感受到脊柱的延展，感恩。').ok, true);
  assert.equal(checkText('满月日不做体式练习，只做调息。').ok, true);
  assert.equal(checkText('').ok, true);
  assert.equal(checkText(null).ok, true);
  assert.equal(checkText(undefined).ok, true);
  assert.equal(checkText(123).ok, true);
});

test('findBlockedWord 返回第一个命中的词', () => {
  assert.equal(findBlockedWord('买六合彩还去赌场'), '六合彩');
  assert.equal(findBlockedWord(''), null);
});

test('BLOCKED_WORDS 词库非空且无重复', () => {
  assert.ok(BLOCKED_WORDS.length > 30);
  assert.equal(new Set(BLOCKED_WORDS).size, BLOCKED_WORDS.length);
});
