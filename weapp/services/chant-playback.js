/**
 * 开篇唱诵播放服务
 *
 * 微信不允许小程序进入后台后再通过 JS 新启动一段音频。为让倒计时阶段也能锁屏，
 * 正式路径使用一条“180 分钟静音 + 开篇唱诵”的后台音频母带：用户点击开始时
 * 音频立即启动，再通过 startTime 跳到“静音尾部 - 用户倒计时”的位置。静音结束
 * 后唱诵自然衔接，不需要在后台进行第二次 API 调用。
 *
 * 低版本没有 BackgroundAudioManager 或母带读取失败时，才回退原来的前台倒计时
 * + 包内唱诵；回退路径会保持屏幕常亮，确保仍能完成流程。
 */

const config = require('../config');

const MAX_COUNTDOWN_SECONDS = 180 * 60;
const CHANT_START_SECONDS = MAX_COUNTDOWN_SECONDS;
// 版本参数同时绕过微信原生音频层对部署前 404 的失败缓存。
const MASTER_AUDIO_URL = `${config.apiBaseUrl}/audio/opening-chant-countdown-180m-v1.m4a?v=20260824`;
const LEGACY_AUDIO_PATH = '/audio/opening-chant.mp3';

let countdownTimer = null;
let countdownDeadline = 0;
let countdownSnapshot = 0;
let masterStartTime = CHANT_START_SECONDS;
let masterPositionReady = false;
let audioContext = null;
let audioKind = 'none';
let audioGeneration = 0;
let boundHandlers = null;
let completionRef = false;
let phase = 'idle';
let usingSilentCountdownAudio = false;
let playbackPaused = false;
let isInBackground = false;
let fallbackAttempted = false;
let callbacks = { onPlay: null, onFinish: null };

function getMasterPosition() {
  if (!usingSilentCountdownAudio || !audioContext || !masterPositionReady) return null;
  const position = Number(audioContext.currentTime);
  if (!Number.isFinite(position)) return null;
  // 部分机型在 startTime 生效前短暂返回 0，不能误算成三小时倒计时。
  if (position < Math.max(0, masterStartTime - 2)) return null;
  return Math.max(0, position);
}

function getRemainingSeconds() {
  if (phase !== 'countdown') return 0;
  const masterPosition = getMasterPosition();
  if (masterPosition !== null) {
    return Math.max(0, Math.ceil(CHANT_START_SECONDS - masterPosition));
  }
  if (playbackPaused) return Math.max(0, Math.ceil(countdownSnapshot));
  if (countdownDeadline) {
    return Math.max(0, Math.ceil((countdownDeadline - Date.now()) / 1000));
  }
  return Math.max(0, Math.ceil(countdownSnapshot));
}

function getState() {
  return {
    phase,
    isCountdown: phase === 'countdown',
    isPlaying: phase === 'playing',
    countdown: getRemainingSeconds(),
    countdownDeadline,
    usingSilentCountdownAudio,
    playbackPaused,
    masterStartTime,
    currentTime: audioContext ? Number(audioContext.currentTime) || 0 : 0
  };
}

function setKeepScreenOn(keepScreenOn) {
  if (typeof wx === 'undefined' || typeof wx.setKeepScreenOn !== 'function') return;
  wx.setKeepScreenOn({ keepScreenOn, fail: () => null });
}

function clearCountdownTimer({ preserveDeadline = false } = {}) {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (!preserveDeadline) countdownDeadline = 0;
}

function notifyPlay(state) {
  if (typeof callbacks.onPlay === 'function') callbacks.onPlay(state);
}

function markChantPlaying() {
  if (phase === 'playing') return;
  phase = 'playing';
  countdownSnapshot = 0;
  clearCountdownTimer();
  setKeepScreenOn(false);
  notifyPlay({ playing: true });
}

function syncPhaseWithMaster() {
  if (!usingSilentCountdownAudio || phase === 'idle') return;
  const position = getMasterPosition();
  if (position === null) return;
  const remaining = Math.max(0, Math.ceil(CHANT_START_SECONDS - position));
  countdownSnapshot = remaining;
  if (remaining > 0) {
    phase = 'countdown';
    notifyPlay({ countdown: remaining });
    return;
  }
  markChantPlaying();
}

function tickCountdown() {
  if (phase !== 'countdown') return;
  const remaining = getRemainingSeconds();
  countdownSnapshot = remaining;
  if (remaining <= 0) {
    // 后台母带必须以真实播放位置为准；尚未拿到 startTime 后的位置时停在 1 秒，
    // 避免网络缓冲期间仅凭墙上时间过早切换“唱诵中”。
    if (usingSilentCountdownAudio && getMasterPosition() === null) {
      notifyPlay({ countdown: 1 });
      return;
    }
    markChantPlaying();
    if (!usingSilentCountdownAudio) playLegacyChant();
    return;
  }
  notifyPlay({ countdown: remaining });
}

function runCountdownTimer() {
  clearCountdownTimer({ preserveDeadline: true });
  tickCountdown();
  if (phase === 'countdown' && !countdownTimer && !isInBackground && !playbackPaused) {
    countdownTimer = setInterval(tickCountdown, 250);
  }
}

function unbindAudioHandlers(context) {
  if (!context || !boundHandlers) return;
  Object.entries(boundHandlers).forEach(([name, handler]) => {
    const offName = `off${name.slice(2)}`;
    if (typeof context[offName] === 'function') context[offName](handler);
  });
  boundHandlers = null;
}

function releaseAudio() {
  if (!audioContext) return;
  const context = audioContext;
  const kind = audioKind;
  audioContext = null;
  audioKind = 'none';
  audioGeneration += 1;
  unbindAudioHandlers(context);
  try {
    context.stop();
  } catch (_error) {
    // 尚未进入可播放状态时 stop 失败不影响状态释放。
  }
  if (kind === 'inner' && typeof context.destroy === 'function') context.destroy();
}

function bindMasterHandlers(context, generation) {
  const isCurrent = () => audioContext === context && audioGeneration === generation;
  const handlers = {
    onCanplay: () => {
      if (!isCurrent()) return;
      const position = Number(context.currentTime);
      masterPositionReady = Number.isFinite(position)
        && position >= Math.max(0, masterStartTime - 2);
      syncPhaseWithMaster();
    },
    onPlay: () => {
      if (!isCurrent()) return;
      playbackPaused = false;
      if (phase === 'countdown') {
        countdownDeadline = Date.now() + Math.max(0, countdownSnapshot) * 1000;
        if (!isInBackground) runCountdownTimer();
      }
    },
    onPause: () => {
      if (!isCurrent()) return;
      countdownSnapshot = getRemainingSeconds();
      playbackPaused = true;
      clearCountdownTimer();
      if (phase === 'countdown') notifyPlay({ countdown: countdownSnapshot });
    },
    onTimeUpdate: () => {
      if (!isCurrent()) return;
      const position = Number(context.currentTime);
      if (
        Number.isFinite(position)
        && position >= Math.max(0, masterStartTime - 2)
      ) masterPositionReady = true;
      syncPhaseWithMaster();
    },
    onSeeking: () => {
      if (isCurrent()) masterPositionReady = false;
    },
    onSeeked: () => {
      if (!isCurrent()) return;
      masterPositionReady = true;
      syncPhaseWithMaster();
    },
    onEnded: () => {
      if (isCurrent()) finish(false);
    },
    onStop: () => {
      if (isCurrent()) finish(false);
    },
    onError: () => {
      if (isCurrent()) handleMasterError();
    }
  };
  boundHandlers = handlers;
  Object.entries(handlers).forEach(([name, handler]) => {
    if (typeof context[name] === 'function') context[name](handler);
  });
}

function startMasterAudio(delaySeconds) {
  usingSilentCountdownAudio = true;
  audioKind = 'background';
  masterStartTime = Math.max(0, CHANT_START_SECONDS - delaySeconds);
  masterPositionReady = false;
  const manager = wx.getBackgroundAudioManager();
  audioContext = manager;
  manager.title = '熬汤日记 · 开篇唱诵';
  manager.epname = delaySeconds > 0 ? '唱诵准备倒计时' : '阿斯汤加开篇唱诵';
  manager.singer = '熬汤日记';
  manager.webUrl = config.apiBaseUrl;
  manager.startTime = masterStartTime;
  const generation = ++audioGeneration;
  bindMasterHandlers(manager, generation);
  manager.src = MASTER_AUDIO_URL;
}

function bindLegacyHandlers(context, generation) {
  const isCurrent = () => audioContext === context && audioGeneration === generation;
  const handlers = {
    onEnded: () => {
      if (isCurrent()) finish(false);
    },
    onError: () => {
      if (isCurrent()) finish(true);
    }
  };
  boundHandlers = handlers;
  Object.entries(handlers).forEach(([name, handler]) => {
    if (typeof context[name] === 'function') context[name](handler);
  });
}

function playLegacyChant() {
  releaseAudio();
  usingSilentCountdownAudio = false;
  phase = 'playing';
  notifyPlay({ playing: true });
  try {
    audioKind = 'inner';
    const context = wx.createInnerAudioContext();
    audioContext = context;
    context.autoplay = true;
    const generation = ++audioGeneration;
    bindLegacyHandlers(context, generation);
    context.src = LEGACY_AUDIO_PATH;
    context.play();
  } catch (_error) {
    finish(true);
  }
}

function startLegacyCountdown(remainingSeconds) {
  usingSilentCountdownAudio = false;
  playbackPaused = false;
  countdownSnapshot = Math.max(0, remainingSeconds);
  if (countdownSnapshot <= 0) {
    playLegacyChant();
    return;
  }
  phase = 'countdown';
  countdownDeadline = Date.now() + countdownSnapshot * 1000;
  setKeepScreenOn(true);
  runCountdownTimer();
}

function handleMasterError() {
  const remaining = phase === 'countdown' ? getRemainingSeconds() : 0;
  releaseAudio();
  usingSilentCountdownAudio = false;
  if (!fallbackAttempted && !isInBackground) {
    fallbackAttempted = true;
    startLegacyCountdown(remaining);
    return;
  }
  finish(true);
}

function startCountdown(delaySeconds, nextCallbacks) {
  stopAll();
  callbacks = {
    onPlay: nextCallbacks && nextCallbacks.onPlay,
    onFinish: nextCallbacks && nextCallbacks.onFinish
  };
  completionRef = false;
  fallbackAttempted = false;
  playbackPaused = false;
  isInBackground = false;

  const safeDelay = Math.min(
    MAX_COUNTDOWN_SECONDS,
    Math.max(0, Number(delaySeconds) || 0)
  );
  countdownSnapshot = safeDelay;
  countdownDeadline = Date.now() + safeDelay * 1000;
  phase = safeDelay > 0 ? 'countdown' : 'playing';
  if (safeDelay > 0) notifyPlay({ countdown: safeDelay });
  else notifyPlay({ playing: true });
  setKeepScreenOn(false);

  if (typeof wx.getBackgroundAudioManager !== 'function') {
    startLegacyCountdown(safeDelay);
    return;
  }

  try {
    startMasterAudio(safeDelay);
    if (safeDelay > 0) runCountdownTimer();
  } catch (_error) {
    handleMasterError();
  }
}

function skipCountdown(nextCallbacks) {
  if (nextCallbacks) {
    callbacks = {
      onPlay: nextCallbacks.onPlay || callbacks.onPlay,
      onFinish: nextCallbacks.onFinish || callbacks.onFinish
    };
  }
  countdownSnapshot = 0;
  clearCountdownTimer();
  setKeepScreenOn(false);
  markChantPlaying();
  if (usingSilentCountdownAudio && audioContext && typeof audioContext.seek === 'function') {
    masterPositionReady = false;
    audioContext.seek(CHANT_START_SECONDS);
    return;
  }
  playLegacyChant();
}

function finish(failed) {
  if (completionRef) return;
  completionRef = true;
  phase = 'idle';
  clearCountdownTimer();
  setKeepScreenOn(false);
  const onFinish = callbacks.onFinish;
  releaseAudio();
  callbacks = { onPlay: null, onFinish: null };
  usingSilentCountdownAudio = false;
  if (typeof onFinish === 'function') onFinish({ failed });
}

function handleBackground() {
  isInBackground = true;
  clearCountdownTimer({ preserveDeadline: true });
  setKeepScreenOn(false);
  // 母带已经从用户点击时开始播放；锁屏后由微信原生后台播放器继续静音倒计时和唱诵。
}

function handleForeground() {
  isInBackground = false;
  if (phase === 'idle') return;
  if (usingSilentCountdownAudio) {
    const position = audioContext ? Number(audioContext.currentTime) : NaN;
    if (
      Number.isFinite(position)
      && position >= Math.max(0, masterStartTime - 2)
    ) masterPositionReady = true;
    syncPhaseWithMaster();
    if (phase === 'countdown' && !playbackPaused) runCountdownTimer();
    return;
  }
  if (phase === 'countdown') {
    setKeepScreenOn(true);
    runCountdownTimer();
  }
}

function stopAll() {
  clearCountdownTimer();
  setKeepScreenOn(false);
  callbacks = { onPlay: null, onFinish: null };
  phase = 'idle';
  completionRef = false;
  usingSilentCountdownAudio = false;
  playbackPaused = false;
  isInBackground = false;
  releaseAudio();
}

module.exports = {
  MAX_COUNTDOWN_SECONDS,
  CHANT_START_SECONDS,
  MASTER_AUDIO_URL,
  getState,
  startCountdown,
  skipCountdown,
  handleBackground,
  handleForeground,
  stopAll
};
