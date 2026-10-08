const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const weappRoot = path.join(__dirname, '..');
const mediaExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.mp3', '.m4a', '.aac', '.wav'
]);

function collectMediaFiles(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'tests') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectMediaFiles(fullPath, result);
    else if (mediaExtensions.has(path.extname(entry.name).toLowerCase())) result.push(fullPath);
  }
  return result;
}

test('upload package enables required-component lazy loading', () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(weappRoot, 'app.json'), 'utf8'));
  assert.equal(appConfig.lazyCodeLoading, 'requiredComponents');
});

test('packaged image and audio files do not exceed 200 KiB each', () => {
  const oversized = collectMediaFiles(weappRoot)
    .map((file) => ({ file: path.relative(weappRoot, file), size: fs.statSync(file).size }))
    .filter(({ size }) => size > 200 * 1024);
  assert.deepEqual(oversized, []);
});
