const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cacheSource = fs.readFileSync(
  path.join(__dirname, '../services/guided-audio-cache.js'),
  'utf8'
);
const variantsSource = fs.readFileSync(
  path.join(__dirname, '../services/guided-audio-variants.js'),
  'utf8'
);
const audioSource = fs.readFileSync(
  path.join(__dirname, '../services/guided-audio.js'),
  'utf8'
);
const practiceSource = fs.readFileSync(
  path.join(__dirname, '../pages/practice/practice.js'),
  'utf8'
);
const practiceTemplate = fs.readFileSync(
  path.join(__dirname, '../pages/practice/practice.wxml'),
  'utf8'
);
const nextConfigSource = fs.readFileSync(
  path.join(__dirname, '../../next.config.mjs'),
  'utf8'
);

test('口令音频使用版本化远端地址、长期响应缓存和 Wi-Fi 持久缓存', () => {
  assert.match(variantsSource, /guruji-led-primary\.m4a\?v=20260720/);
    assert.match(variantsSource, /sharath-jois-led-primary-v1\.m4a\?v=20260904/);
  assert.match(cacheSource, /USER_DATA_PATH/);
  assert.match(cacheSource, /networkType !== 'wifi'/);
  assert.match(variantsSource, /minValidBytes: 40 \* 1024 \* 1024/);
    assert.match(variantsSource, /minValidBytes: 30 \* 1024 \* 1024/);
  assert.match(cacheSource, /wx\.downloadFile/);
  assert.match(cacheSource, /backgroundCacheScheduled/);
  assert.match(nextConfigSource, /source: '\/audio\/:path\*'/);
  assert.match(nextConfigSource, /public, max-age=31536000, immutable/);
});

test('今日练习进入即预热，播放页反馈真实加载阶段', () => {
  assert.match(practiceSource, /onLoad\(\)[\s\S]*guidedAudio\.preload\(\)/);
  assert.match(practiceSource, /guidedAudioLoadingText/);
  assert.match(practiceSource, /onStatus: \(\{ status, text \}\)/);
  assert.match(practiceTemplate, /\{\{guidedAudioLoadingText\}\}/);
  assert.doesNotMatch(practiceTemplate, />加载音频中\.\.\.<\/text>/);
});

test('播放器优先本地缓存、损坏自动回退，并记录首播与缓冲诊断', () => {
  assert.match(audioSource, /cachedPath \? 'local' : 'remote'/);
  assert.match(audioSource, /guidedAudioCache\.removeCachedFile\(currentVariant\)/);
  assert.match(audioSource, /createAudioContext\(true, true\)/);
  assert.match(audioSource, /onWaiting: \(\) =>/);
  assert.match(audioSource, /canplay_ms/);
  assert.match(audioSource, /play_request_to_play_ms/);
  assert.match(audioSource, /waiting_count/);
  assert.match(audioSource, /scheduleBackgroundCache\(currentVariant, 30000\)/);
});

test('一序列双击打开可滚动版本弹窗并持久化选择', () => {
  assert.match(practiceSource, /option\.id === 'guided_audio'[\s\S]*showGuidedAudioVersions: true/);
  assert.match(practiceSource, /storeGuidedAudioVariant/);
  assert.match(practiceSource, /guidedAudio\.selectVariant\(variant\.id, false\)/);
  assert.match(practiceTemplate, /选择口令版本/);
  assert.match(practiceTemplate, /scroll-view[\s\S]*guidedAudioVariants/);
  assert.match(practiceTemplate, /selectedGuidedAudioVariantId === item\.id/);
  assert.match(practiceTemplate, /guidedAudioComfortProgress/);
});

test('正式口令使用后台播放器，锁屏时保留实例并在回前台校准进度', () => {
  assert.match(audioSource, /wx\.getBackgroundAudioManager\(\)/);
  assert.match(audioSource, /AUDIO_TITLE = '熬汤日记 · 一序列口令'/);
  assert.match(audioSource, /function handleBackground\(\)[\s\S]*不释放 BackgroundAudioManager/);
  assert.match(audioSource, /function handleForeground\(\)[\s\S]*emitProgress\(\)/);
  assert.match(practiceSource, /onShow\(\)[\s\S]*guidedAudio\.handleForeground\(\)/);
  assert.match(
    practiceSource,
    /activePractice\.optionId === 'guided_audio'[\s\S]*guidedAudio\.handleBackground\(\)/
  );
  assert.match(practiceSource, /onPlaybackPause:[\s\S]*practiceSession\.pause/);
  assert.match(practiceSource, /onPlaybackResume:[\s\S]*practiceSession\.resume/);
});

test('预热完成后开始口令会复用同一音频上下文并立即播放', () => {
  const storage = new Map();
  const handlers = {};
  let createdCount = 0;
  let playCount = 0;
  const context = {
    currentTime: 0,
    duration: 5285,
    autoplay: false,
    obeyMuteSwitch: true,
    play() {
      playCount += 1;
      if (handlers.play) handlers.play();
    },
    pause() {},
    stop() {},
    destroy() {},
    seek() {},
    onCanplay(handler) { handlers.canplay = handler; },
    onPlay(handler) { handlers.play = handler; },
    onWaiting(handler) { handlers.waiting = handler; },
    onTimeUpdate(handler) { handlers.timeUpdate = handler; },
    onEnded(handler) { handlers.ended = handler; },
    onError(handler) { handlers.error = handler; }
  };

  global.wx = {
    env: { USER_DATA_PATH: '/test-user-data' },
    getStorageSync(key) { return storage.get(key); },
    setStorageSync(key, value) { storage.set(key, value); },
    removeStorageSync(key) { storage.delete(key); },
    getFileSystemManager() {
      return {
        statSync() { throw new Error('not cached'); },
        mkdirSync() {},
        accessSync() {},
        unlinkSync() {}
      };
    },
    createInnerAudioContext() {
      createdCount += 1;
      return context;
    }
  };

  const cachePath = require.resolve('../services/guided-audio-cache');
  const servicePath = require.resolve('../services/guided-audio');
  delete require.cache[cachePath];
  delete require.cache[servicePath];
  const guidedAudio = require('../services/guided-audio');

  assert.equal(guidedAudio.preload(), true);
  assert.equal(createdCount, 1);
  assert.match(context.src, /guruji-led-primary\.m4a\?v=20260720/);
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (handler) => {
    handler();
    return 1;
  };
  handlers.canplay();
  global.setTimeout = originalSetTimeout;

  let readyCount = 0;
  guidedAudio.load({
    onReady() { readyCount += 1; }
  });
  assert.equal(createdCount, 1);
  assert.equal(readyCount, 1);
  assert.equal(playCount, 1);
  assert.equal(guidedAudio.getDiagnostics().source_type, 'remote');
  guidedAudio.releaseAudio();
});

test('支持后台播放器时正式播放使用远端音频且前后台切换不销毁进度', () => {
  const storage = new Map();
  const handlers = {};
  let innerCreated = 0;
  let backgroundCreated = 0;
  let stopCount = 0;
  let progressAt = 0;
  const context = {
    currentTime: 12,
    duration: 5285,
    paused: false,
    play() { this.paused = false; if (handlers.play) handlers.play(); },
    pause() { this.paused = true; if (handlers.pause) handlers.pause(); },
    stop() { stopCount += 1; this.paused = true; },
    seek(position) { this.currentTime = position; },
    onCanplay(handler) { handlers.canplay = handler; },
    onPlay(handler) { handlers.play = handler; },
    onPause(handler) { handlers.pause = handler; },
    onWaiting(handler) { handlers.waiting = handler; },
    onTimeUpdate(handler) { handlers.timeUpdate = handler; },
    onEnded(handler) { handlers.ended = handler; },
    onStop(handler) { handlers.stop = handler; },
    onError(handler) { handlers.error = handler; },
    offCanplay() {},
    offPlay() {},
    offPause() {},
    offWaiting() {},
    offTimeUpdate() {},
    offEnded() {},
    offStop() {},
    offError() {}
  };

  global.wx = {
    env: { USER_DATA_PATH: '/test-user-data' },
    getStorageSync(key) { return storage.get(key); },
    setStorageSync(key, value) { storage.set(key, value); },
    removeStorageSync(key) { storage.delete(key); },
    getFileSystemManager() {
      return {
        statSync() { throw new Error('not cached'); },
        mkdirSync() {},
        accessSync() {},
        unlinkSync() {}
      };
    },
    createInnerAudioContext() {
      innerCreated += 1;
      return context;
    },
    getBackgroundAudioManager() {
      backgroundCreated += 1;
      return context;
    }
  };

  const cachePath = require.resolve('../services/guided-audio-cache');
  const servicePath = require.resolve('../services/guided-audio');
  delete require.cache[cachePath];
  delete require.cache[servicePath];
  const guidedAudio = require('../services/guided-audio');

  guidedAudio.load({
    onTimeUpdate({ currentTime }) { progressAt = currentTime; }
  });
  assert.equal(backgroundCreated, 1);
  assert.equal(innerCreated, 0);
  assert.match(context.src, /guruji-led-primary\.m4a\?v=20260720/);
  assert.equal(context.title, '熬汤日记 · 一序列口令');
  handlers.canplay();
  assert.equal(guidedAudio.getState().playerType, 'background');

  guidedAudio.handleBackground();
  assert.equal(stopCount, 0);
  context.currentTime = 88;
  guidedAudio.handleForeground();
  assert.equal(progressAt, 88);
  assert.equal(stopCount, 0);

  guidedAudio.releaseAudio();
  assert.equal(stopCount, 1);
});

test('切换到 Sharath 后后台播放器使用对应音源、标题和诊断版本', () => {
  const storage = new Map();
  const handlers = {};
  const context = {
    currentTime: 0,
    duration: 5381,
    paused: false,
    play() {},
    pause() {},
    stop() {},
    seek() {},
    onCanplay(handler) { handlers.canplay = handler; },
    onPlay(handler) { handlers.play = handler; },
    onPause(handler) { handlers.pause = handler; },
    onWaiting(handler) { handlers.waiting = handler; },
    onTimeUpdate(handler) { handlers.timeUpdate = handler; },
    onEnded(handler) { handlers.ended = handler; },
    onStop(handler) { handlers.stop = handler; },
    onError(handler) { handlers.error = handler; }
  };

  global.wx = {
    env: { USER_DATA_PATH: '/test-user-data' },
    getStorageSync(key) { return storage.get(key); },
    setStorageSync(key, value) { storage.set(key, value); },
    removeStorageSync(key) { storage.delete(key); },
    getFileSystemManager() {
      return {
        statSync() { throw new Error('not cached'); },
        mkdirSync() {},
        accessSync() {},
        unlinkSync() {}
      };
    },
    createInnerAudioContext() { return context; },
    getBackgroundAudioManager() { return context; }
  };

  const variantsPath = require.resolve('../services/guided-audio-variants');
  const cachePath = require.resolve('../services/guided-audio-cache');
  const servicePath = require.resolve('../services/guided-audio');
  delete require.cache[variantsPath];
  delete require.cache[cachePath];
  delete require.cache[servicePath];
  const guidedAudio = require('../services/guided-audio');

  guidedAudio.selectVariant('sharath-jois-led-primary');
  guidedAudio.load({});

    assert.match(context.src, /sharath-jois-led-primary-v1\.m4a\?v=20260904/);
  assert.equal(context.epname, 'Sharath Jois版口令');
  assert.equal(context.webUrl, context.src);
  assert.equal(guidedAudio.getState().variantId, 'sharath-jois-led-primary');
  assert.equal(guidedAudio.getDiagnostics().variant_id, 'sharath-jois-led-primary');
  assert.equal(storage.get('ashtanga_guided_audio_variant'), 'sharath-jois-led-primary');
  guidedAudio.releaseAudio();
});

test('两个口令版本的持久缓存彼此隔离，清理 Sharath 不影响老掌门人', () => {
  const storage = new Map([
    ['guided_audio_cache_meta:guruji-led-primary', {
      version: '20260720-v1',
      path: '/cache/guruji.m4a'
    }],
    ['guided_audio_cache_meta:sharath-jois-led-primary', {
        version: '20260904-v2',
      path: '/cache/sharath.m4a'
    }]
  ]);
  const removed = [];
  global.wx = {
    env: { USER_DATA_PATH: '/test-user-data' },
    getStorageSync(key) { return storage.get(key); },
    setStorageSync(key, value) { storage.set(key, value); },
    removeStorageSync(key) { storage.delete(key); },
    getFileSystemManager() {
      return {
        statSync(path) {
            return { size: path.includes('sharath') ? 32 * 1024 * 1024 : 44 * 1024 * 1024 };
        },
        unlinkSync(path) { removed.push(path); }
      };
    }
  };

  const variantsPath = require.resolve('../services/guided-audio-variants');
  const cachePath = require.resolve('../services/guided-audio-cache');
  delete require.cache[variantsPath];
  delete require.cache[cachePath];
  const cache = require('../services/guided-audio-cache');

  assert.equal(cache.getCachedPath('guruji-led-primary'), '/cache/guruji.m4a');
  assert.equal(cache.getCachedPath('sharath-jois-led-primary'), '/cache/sharath.m4a');
  cache.removeCachedFile('sharath-jois-led-primary');
  assert.deepEqual(removed, ['/cache/sharath.m4a']);
  assert.equal(cache.getCachedPath('guruji-led-primary'), '/cache/guruji.m4a');
  assert.equal(cache.getCachedPath('sharath-jois-led-primary'), '');
});
