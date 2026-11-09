const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const servicePath = require.resolve('../services/custom-font');

test('loads the production Noto Serif SC font globally once', () => {
  const calls = [];
  global.wx = {
    loadFontFace(options) {
      calls.push(options);
    }
  };
  delete require.cache[servicePath];

  const customFont = require('../services/custom-font');
  customFont.loadGlobalFont();
  customFont.loadGlobalFont();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].global, true);
  assert.equal(calls[0].family, 'Ashtanga Serif');
  assert.match(
    calls[0].source,
    /^url\("https:\/\/ash\.ashtangalife\.online\/fonts\/.+\.woff\?v=\d{8}-\d+"\)$/
  );
  assert.equal(customFont.FONT_VERSION, '20260811-1');
  delete global.wx;
});

test('app launch starts font loading and global WXSS uses the same family', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const appStyle = fs.readFileSync(path.join(__dirname, '..', 'app.wxss'), 'utf8');

  assert.match(appSource, /customFont\.loadGlobalFont\(\)/);
  assert.match(appStyle, /font-family:\s*'Ashtanga Serif'/);
});

test('Android 字体超时后进入冷却期，不会每次回前台再等待二十秒', () => {
  const storage = new Map();
  let callCount = 0;
  global.wx = {
    getStorageSync(key) { return storage.get(key); },
    setStorageSync(key, value) { storage.set(key, value); },
    removeStorageSync(key) { storage.delete(key); },
    loadFontFace(options) {
      callCount += 1;
      options.fail({ errMsg: 'loadFontFace:fail fail:time out' });
    }
  };
  delete require.cache[servicePath];
  const customFont = require('../services/custom-font');
  customFont.loadGlobalFont();
  customFont.loadGlobalFont();
  assert.equal(callCount, 1);
  assert.equal(storage.get(customFont.FONT_FAILURE_KEY).version, customFont.FONT_VERSION);
  delete global.wx;
});

test('the hosted font asset is a compact WOFF file', () => {
  const fontPath = path.join(
    __dirname,
    '..',
    '..',
    'public',
    'fonts',
    'ashtanga-noto-serif-sc-ui-v2.woff'
  );
  const font = fs.readFileSync(fontPath);

  assert.equal(font.subarray(0, 4).toString('ascii'), 'wOFF');
  assert.ok(font.length > 100_000);
  assert.ok(font.length < 500_000);
});
