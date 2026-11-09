const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(ROOT, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test('开篇唱诵声明后台音频并使用三小时静音唱诵母带', () => {
  const appConfig = JSON.parse(read('app.json'));
  const service = read('services/chant-playback.js');

  assert.deepEqual(appConfig.requiredBackgroundModes, ['audio']);
  assert.match(service, /MAX_COUNTDOWN_SECONDS = 180 \* 60/);
  assert.match(service, /opening-chant-countdown-180m-v1\.m4a\?v=20260824/);
  assert.match(service, /wx\.getBackgroundAudioManager\(\)/);
  assert.match(service, /manager\.startTime = masterStartTime/);
  assert.match(service, /manager\.src = MASTER_AUDIO_URL/);
});

test('任意倒计时映射到母带静音尾部，跳过时直接 seek 到唱诵起点', () => {
  const service = read('services/chant-playback.js');

  assert.match(
    service,
    /masterStartTime = Math\.max\(0, CHANT_START_SECONDS - delaySeconds\)/
  );
  assert.match(service, /audioContext\.seek\(CHANT_START_SECONDS\)/);
  assert.match(service, /CHANT_START_SECONDS - masterPosition/);
  assert.doesNotMatch(service, /remaining\s*-=\s*1/);
});

test('锁屏不停止静音倒计时母带，回前台按真实播放位置校准', () => {
  const service = read('services/chant-playback.js');
  const page = read('pages/practice/practice.js');
  const pageMarkup = read('pages/practice/practice.wxml');

  assert.match(service, /function handleBackground\(\)[\s\S]*微信原生后台播放器/);
  assert.match(service, /function handleForeground\(\)[\s\S]*syncPhaseWithMaster\(\)/);
  assert.match(page, /onHide\(\)[\s\S]*chantPlayback\.handleBackground\(\)/);
  assert.match(page, /onShow\(\)[\s\S]*chantPlayback\.handleForeground\(\)/);
  assert.match(page, /onUnload\(\)[\s\S]*chantPlayback\.stopAll\(\)/);
  assert.match(pageMarkup, /倒计时期间即可锁屏/);
  assert.doesNotMatch(pageMarkup, /倒计时阶段会保持屏幕亮起/);
});

test('静音唱诵母带为 fast-start M4A 且不进入小程序代码包', () => {
  const assetPath = path.join(
    PROJECT_ROOT,
    'public/audio/opening-chant-countdown-180m-v1.m4a'
  );
  const packagedPath = path.join(ROOT, 'audio/opening-chant-countdown-180m-v1.m4a');
  const bytes = fs.readFileSync(assetPath);
  const text = bytes.toString('latin1');
  const moovAt = text.indexOf('moov');
  const mdatAt = text.indexOf('mdat');

  assert.equal(fs.existsSync(packagedPath), false);
  assert.ok(bytes.length > 1024 * 1024);
  assert.ok(bytes.length < 5 * 1024 * 1024);
  assert.ok(moovAt > 0);
  assert.ok(mdatAt > moovAt);
});

test('60 秒倒计时从母带 10740 秒启动并在锁屏期间保持同一播放器', () => {
  const handlers = {};
  const states = [];
  let finishCount = 0;
  let stopCount = 0;
  const manager = {
    currentTime: 0,
    paused: false,
    seek(position) { this.currentTime = position; },
    stop() { stopCount += 1; },
    onCanplay(handler) { handlers.onCanplay = handler; },
    onPlay(handler) { handlers.onPlay = handler; },
    onPause(handler) { handlers.onPause = handler; },
    onTimeUpdate(handler) { handlers.onTimeUpdate = handler; },
    onSeeking(handler) { handlers.onSeeking = handler; },
    onSeeked(handler) { handlers.onSeeked = handler; },
    onEnded(handler) { handlers.onEnded = handler; },
    onStop(handler) { handlers.onStop = handler; },
    onError(handler) { handlers.onError = handler; },
    offCanplay() {},
    offPlay() {},
    offPause() {},
    offTimeUpdate() {},
    offSeeking() {},
    offSeeked() {},
    offEnded() {},
    offStop() {},
    offError() {}
  };

  global.wx = {
    getBackgroundAudioManager() { return manager; },
    setKeepScreenOn() {},
    createInnerAudioContext() { throw new Error('should not use legacy player'); }
  };

  const servicePath = require.resolve('../services/chant-playback');
  delete require.cache[servicePath];
  const chantPlayback = require('../services/chant-playback');
  chantPlayback.startCountdown(60, {
    onPlay(state) { states.push(state); },
    onFinish() { finishCount += 1; }
  });

  assert.equal(manager.startTime, 10740);
  assert.match(manager.src, /opening-chant-countdown-180m-v1\.m4a/);
  manager.currentTime = 10740;
  handlers.onCanplay();
  chantPlayback.handleBackground();
  assert.equal(stopCount, 0);

  manager.currentTime = 10799;
  handlers.onTimeUpdate();
  assert.deepEqual(states.at(-1), { countdown: 1 });
  manager.currentTime = 10800;
  handlers.onTimeUpdate();
  assert.deepEqual(states.at(-1), { playing: true });
  handlers.onEnded();
  assert.equal(finishCount, 1);
  assert.equal(stopCount, 1);
});
