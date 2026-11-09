const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const share = require('../utils/practice-share');

test('friend shares always open Today Practice with a fixed safe image', () => {
  const result = share.pageShareHandlers.onShareAppMessage();
  assert.deepEqual(result, {
    title: share.SHARE_TITLE,
    path: '/pages/practice/practice',
    imageUrl: '/images/share-practice-final.jpg'
  });
});

test('timeline shares carry a marker that redirects recipients to Today Practice', () => {
  const result = share.pageShareHandlers.onShareTimeline();
  assert.equal(result.query, 'shareTarget=practice');
  assert.equal(result.imageUrl, '/images/icon-green.png');

  let target = '';
  global.wx = {
    switchTab({ url }) {
      target = url;
    }
  };
  assert.equal(share.redirectTimelineEntryToPractice({ shareTarget: 'practice' }), true);
  assert.equal(target, '/pages/practice/practice');
  assert.equal(share.redirectTimelineEntryToPractice({}), false);
  delete global.wx;
});

test('share menu enables friend and timeline entries', () => {
  let menus = [];
  global.wx = {
    showShareMenu(options) {
      menus = options.menus;
    }
  };
  share.showShareMenu();
  assert.deepEqual(menus, ['shareAppMessage', 'shareTimeline']);
  delete global.wx;
});

test('every registered page uses the shared native-share handlers', () => {
  const weappRoot = path.resolve(__dirname, '..');
  const appConfig = JSON.parse(fs.readFileSync(path.join(weappRoot, 'app.json'), 'utf8'));
  const pagePaths = [...appConfig.pages];
  for (const subPackage of appConfig.subPackages || []) {
    for (const page of subPackage.pages || []) {
      pagePaths.push(`${subPackage.root}/${page}`);
    }
  }

  for (const pagePath of pagePaths) {
    const source = fs.readFileSync(path.join(weappRoot, `${pagePath}.js`), 'utf8');
    assert.match(source, /practice-share/, `${pagePath} should import practice sharing`);
    assert.match(source, /\.\.\.practiceShare\.pageShareHandlers/, `${pagePath} should register share handlers`);
    assert.match(source, /practiceShare\.showShareMenu\(\)/, `${pagePath} should show the share menu`);
  }
});
