/**
 * 口令跟练音频服务
 *
 * - 页面预热继续使用 InnerAudioContext，不会在用户点击前自动发声。
 * - 正式跟练使用 BackgroundAudioManager，支持锁屏和切到微信后台后继续播放。
 * - 前台预热/低版本回退仍可使用 USER_DATA_PATH 缓存；正式后台播放固定使用远端流媒体。
 * - 前台保留进度、暂停、继续和跳转；回到前台后用播放器真实 currentTime 校准 UI。
 * - 把关键耗时及前后台事件写入本地诊断，运行日志可直接看到真机状态。
 */

const guidedAudioCache = require('./guided-audio-cache');
const guidedAudioVariants = require('./guided-audio-variants');

const DIAGNOSTICS_KEY = 'guided_audio_diagnostics';
const AUDIO_TITLE = '熬汤日记 · 一序列口令';
const AUDIO_SINGER = '熬汤日记';

let audioContext = null;
let audioKind = 'none';
let boundHandlers = null;
let audioGeneration = 0;
let loadingRef = false;
let shouldPlayOnReady = false;
let callbacks = {};
let readyEmitted = false;
let currentSourceType = 'remote';
let fallbackAttempted = false;
let preloadStartedAt = 0;
let loadRequestedAt = 0;
let firstPlayRequestedAt = 0;
let diagnostics = readDiagnostics();
let currentVariant = guidedAudioVariants.getStoredGuidedAudioVariant();

let currentState = {
  isLoading: false,
  isLoaded: false,
  error: null,
  sourceType: 'remote',
  playerType: 'none',
  variantId: currentVariant.id,
  status: 'idle'
};

function readDiagnostics() {
  try {
    return wx.getStorageSync(DIAGNOSTICS_KEY) || {};
  } catch (_error) {
    return {};
  }
}

function writeDiagnostics(event, extra = {}) {
  diagnostics = {
    ...diagnostics,
    ...extra,
    last_event: event,
    last_event_at: new Date().toISOString(),
    source_type: currentSourceType,
    player_type: audioKind,
    variant_id: currentVariant.id,
    variant_note: currentVariant.note,
    cache: guidedAudioCache.getState(currentVariant)
  };
  try {
    wx.setStorageSync(DIAGNOSTICS_KEY, diagnostics);
  } catch (_error) {
    // 诊断写入失败不影响播放。
  }
}

function emitStatus(status, text, extra = {}) {
  currentState = {
    ...currentState,
    status,
    sourceType: currentSourceType,
    playerType: audioKind,
    variantId: currentVariant.id,
    ...extra
  };
  if (typeof callbacks.onStatus === 'function') {
    callbacks.onStatus({
      status,
      text,
      sourceType: currentSourceType,
      playerType: audioKind,
      variantId: currentVariant.id,
      cache: guidedAudioCache.getState(currentVariant)
    });
  }
}

function setCallbacks(nextCallbacks = {}, resetReady = true) {
  callbacks = nextCallbacks;
  if (resetReady) readyEmitted = false;
}

function emitProgress() {
  if (!audioContext) return;
  const currentTime = Math.max(0, Number(audioContext.currentTime) || 0);
  const duration = Math.max(0, Number(audioContext.duration) || 0);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  if (typeof callbacks.onTimeUpdate === 'function') {
    callbacks.onTimeUpdate({ currentTime, duration, progress });
  }
}

function handleReady() {
  const now = Date.now();
  const startedAt = loadRequestedAt || preloadStartedAt;
  currentState = {
    isLoading: false,
    isLoaded: true,
    error: null,
    sourceType: currentSourceType,
    playerType: audioKind,
    variantId: currentVariant.id,
    status: audioKind === 'background' && audioContext && !audioContext.paused ? 'playing' : 'ready'
  };
  loadingRef = false;
  writeDiagnostics('canplay', {
    canplay_at: new Date(now).toISOString(),
    canplay_ms: startedAt ? now - startedAt : null
  });
  emitStatus(
    currentState.status,
    currentSourceType === 'local' ? '已从本机缓存读取' : '口令音频已就绪'
  );

  if (!readyEmitted && typeof callbacks.onReady === 'function') {
    readyEmitted = true;
    callbacks.onReady();
  }
  // BackgroundAudioManager 设置 src 后会自动播放；只有前台播放器需要显式 play。
  if (shouldPlayOnReady && audioKind === 'inner' && audioContext) {
    firstPlayRequestedAt = Date.now();
    audioContext.play();
  }
  shouldPlayOnReady = false;
  emitProgress();

  if (currentSourceType === 'remote') {
    guidedAudioCache.scheduleBackgroundCache(currentVariant, 30000);
  }
}

function unbindAudioHandlers(context) {
  if (!context || !boundHandlers) return;
  Object.entries(boundHandlers).forEach(([name, handler]) => {
    const offName = `off${name.slice(2)}`;
    if (typeof context[offName] === 'function') {
      context[offName](handler);
    }
  });
  boundHandlers = null;
}

function destroyContext() {
  if (!audioContext) return;
  const context = audioContext;
  const kind = audioKind;
  audioContext = null;
  audioKind = 'none';
  // 即使旧版基础库缺少 offXxx，旧播放器稍后补发的 stop/error 也会被代次门禁忽略。
  audioGeneration += 1;
  unbindAudioHandlers(context);
  try {
    context.stop();
  } catch (_error) {
    // 已销毁或尚未就绪时无需处理。
  }
  if (kind === 'inner' && typeof context.destroy === 'function') {
    context.destroy();
  }
}

function handleFinalAudioError(result) {
  const errorMessage = result && result.errMsg ? result.errMsg : '音频播放失败';
  writeDiagnostics('error', { error: errorMessage });

  if (currentSourceType === 'local' && !fallbackAttempted) {
    fallbackAttempted = true;
    guidedAudioCache.removeCachedFile(currentVariant);
    destroyContext();
    loadingRef = true;
    currentState = {
      isLoading: true,
      isLoaded: false,
      error: null,
      sourceType: 'remote',
      playerType: 'background',
      variantId: currentVariant.id,
      status: 'remote-prepare'
    };
    createAudioContext(true, true);
    return;
  }

  currentState = {
    isLoading: false,
    isLoaded: false,
    error: '音频播放失败',
    sourceType: currentSourceType,
    playerType: audioKind,
    variantId: currentVariant.id,
    status: 'error'
  };
  loadingRef = false;
  shouldPlayOnReady = false;
  emitStatus('error', '音频播放失败，请重试');
  if (typeof callbacks.onError === 'function') {
    callbacks.onError({ errMsg: errorMessage });
  }
}

function handleAudioEnded(reason = 'ended') {
  const onEnded = callbacks.onEnded;
  writeDiagnostics(reason);
  releaseAudio();
  if (typeof onEnded === 'function') onEnded();
}

function bindAudioHandlers(context, generation) {
  const isCurrentContext = () => audioContext === context && audioGeneration === generation;
  const handlers = {
    onCanplay: () => {
      if (isCurrentContext()) handleReady();
    },
    onPlay: () => {
      if (!isCurrentContext()) return;
      const nowAt = Date.now();
      writeDiagnostics('play', {
        play_started_at: new Date(nowAt).toISOString(),
        play_request_to_play_ms: firstPlayRequestedAt ? nowAt - firstPlayRequestedAt : null
      });
      emitStatus('playing', '正在播放', { isLoading: false });
      if (readyEmitted && typeof callbacks.onPlaybackResume === 'function') {
        callbacks.onPlaybackResume();
      }
    },
    onPause: () => {
      if (!isCurrentContext()) return;
      writeDiagnostics('pause', {
        current_time: audioContext ? Number(audioContext.currentTime) || 0 : 0
      });
      emitStatus('paused', '已暂停', { isLoading: false });
      emitProgress();
      if (readyEmitted && typeof callbacks.onPlaybackPause === 'function') {
        callbacks.onPlaybackPause();
      }
    },
    onWaiting: () => {
      if (!isCurrentContext()) return;
      const waitingCount = Number(diagnostics.waiting_count || 0) + 1;
      writeDiagnostics('waiting', { waiting_count: waitingCount });
      emitStatus('buffering', '网络缓冲中…', { isLoading: true });
    },
    onTimeUpdate: () => {
      if (!isCurrentContext()) return;
      if (currentState.status === 'buffering') {
        emitStatus('playing', '正在播放', { isLoading: false, isLoaded: true });
      }
      emitProgress();
    },
    onEnded: () => {
      if (isCurrentContext()) handleAudioEnded('ended');
    },
    onStop: () => {
      if (isCurrentContext()) handleAudioEnded('stopped');
    },
    onError: (result) => {
      if (isCurrentContext()) handleFinalAudioError(result);
    }
  };

  boundHandlers = handlers;
  Object.entries(handlers).forEach(([name, handler]) => {
    if (typeof context[name] === 'function') context[name](handler);
  });
}

function createAudioContext(forceRemote = false, forPlayback = false) {
  const canUseBackground = forPlayback && typeof wx.getBackgroundAudioManager === 'function';
  // BackgroundAudioManager 的正式能力以网络音频为准；不把大体积本机缓存交给它
  // 反复试错，避免失败后删除、下次又重新下载的流量循环。
  const cachedPath = forceRemote || canUseBackground ? '' : guidedAudioCache.getCachedPath(currentVariant);
  currentSourceType = cachedPath ? 'local' : 'remote';
  const source = cachedPath || currentVariant.audioUrl;

  if (canUseBackground) {
    audioKind = 'background';
    audioContext = wx.getBackgroundAudioManager();
    audioContext.title = AUDIO_TITLE;
    audioContext.epname = currentVariant.note;
    audioContext.singer = AUDIO_SINGER;
    audioContext.webUrl = currentVariant.audioUrl;
  } else {
    audioKind = 'inner';
    audioContext = wx.createInnerAudioContext();
    audioContext.autoplay = false;
    audioContext.obeyMuteSwitch = false;
  }

  const now = Date.now();
  writeDiagnostics('context-created', {
    context_created_at: new Date(now).toISOString(),
    source,
    preload_started_at: preloadStartedAt ? new Date(preloadStartedAt).toISOString() : null,
    load_requested_at: loadRequestedAt ? new Date(loadRequestedAt).toISOString() : null,
    waiting_count: 0
  });
  emitStatus(
    currentSourceType === 'local' ? 'local-prepare' : 'remote-prepare',
    currentSourceType === 'local'
      ? '正在读取已缓存口令音频…'
      : '首次加载口令音频，后续将自动加速'
  );

  const generation = ++audioGeneration;
  bindAudioHandlers(audioContext, generation);
  if (audioKind === 'background') firstPlayRequestedAt = Date.now();
  try {
    audioContext.src = source;
  } catch (error) {
    handleFinalAudioError(error);
  }
}

function selectVariant(id, persist = true) {
  const nextVariant = guidedAudioVariants.getGuidedAudioVariant(id);
  if (persist) guidedAudioVariants.storeGuidedAudioVariant(nextVariant.id);
  if (nextVariant.id === currentVariant.id) return currentVariant;

  const previousVariantId = currentVariant.id;
  destroyContext();
  loadingRef = false;
  shouldPlayOnReady = false;
  fallbackAttempted = false;
  currentVariant = nextVariant;
  currentSourceType = 'remote';
  currentState = {
    isLoading: false,
    isLoaded: false,
    error: null,
    sourceType: 'remote',
    playerType: 'none',
    variantId: currentVariant.id,
    status: 'idle'
  };
  setCallbacks({});
  writeDiagnostics('variant-selected', {
    previous_variant_id: previousVariantId,
    selected_variant_id: currentVariant.id
  });
  return currentVariant;
}

function preload(variantId) {
  if (variantId) selectVariant(variantId, false);
  if (audioContext || loadingRef) return false;
  preloadStartedAt = Date.now();
  loadRequestedAt = 0;
  loadingRef = true;
  shouldPlayOnReady = false;
  fallbackAttempted = false;
  setCallbacks({});
  currentState = {
    isLoading: true,
    isLoaded: false,
    error: null,
    sourceType: guidedAudioCache.getCachedPath(currentVariant) ? 'local' : 'remote',
    playerType: 'inner',
    variantId: currentVariant.id,
    status: 'preloading'
  };
  writeDiagnostics('preload-started', {
    preload_started_at: new Date(preloadStartedAt).toISOString()
  });
  createAudioContext(false, false);
  return true;
}

function load(nextCallbacks, variantId) {
  if (variantId) selectVariant(variantId, false);
  setCallbacks(nextCallbacks);
  shouldPlayOnReady = true;
  loadRequestedAt = Date.now();
  writeDiagnostics('load-requested', {
    load_requested_at: new Date(loadRequestedAt).toISOString()
  });

  // 已经处于正式后台播放器中时，只重新绑定当前页面回调，不重置音源和进度。
  if (audioContext && audioKind === 'background' && currentState.isLoaded) {
    handleReady();
    return true;
  }
  if (audioContext && audioKind === 'background' && loadingRef) {
    emitStatus(
      currentSourceType === 'local' ? 'local-prepare' : 'remote-prepare',
      currentSourceType === 'local'
        ? '正在读取已缓存口令音频…'
        : '首次加载口令音频，后续将自动加速'
    );
    return true;
  }

  // 不支持后台播放器的低版本环境保留原来的预热复用路径。
  if (
    audioContext
    && audioKind === 'inner'
    && typeof wx.getBackgroundAudioManager !== 'function'
  ) {
    if (currentState.isLoaded) {
      handleReady();
      return true;
    }
    if (loadingRef) return true;
  }

  // 正式播放必须升级为 BackgroundAudioManager。预热用的 InnerAudioContext 在此释放。
  destroyContext();
  loadingRef = true;
  fallbackAttempted = false;
  currentState = {
    isLoading: true,
    isLoaded: false,
    error: null,
    sourceType: guidedAudioCache.getCachedPath(currentVariant) ? 'local' : 'remote',
    playerType: typeof wx.getBackgroundAudioManager === 'function' ? 'background' : 'inner',
    variantId: currentVariant.id,
    status: 'loading'
  };
  createAudioContext(false, true);
  return true;
}

function play() {
  if (!audioContext) return;
  firstPlayRequestedAt = Date.now();
  audioContext.play();
}

function pause() {
  if (audioContext) audioContext.pause();
}

function seek(direction, seekStep = 15) {
  if (!audioContext) return;
  const duration = Number(audioContext.duration) || 0;
  const currentTime = Number(audioContext.currentTime) || 0;
  if (!duration) return;
  const delta = direction === 'forward' ? seekStep : -seekStep;
  audioContext.seek(Math.max(0, Math.min(duration, currentTime + delta)));
}

function retry(nextCallbacks) {
  destroyContext();
  loadingRef = false;
  currentState = {
    isLoading: false,
    isLoaded: false,
    error: null,
    sourceType: 'remote',
    playerType: 'none',
    variantId: currentVariant.id,
    status: 'idle'
  };
  return load(nextCallbacks);
}

function handleBackground() {
  writeDiagnostics('background', {
    current_time: audioContext ? Number(audioContext.currentTime) || 0 : 0,
    paused: audioContext ? Boolean(audioContext.paused) : true
  });
  // 不释放 BackgroundAudioManager；进入后台前已开始的口令由微信原生播放器接管。
}

function handleForeground() {
  if (!audioContext) return getState();
  writeDiagnostics('foreground', {
    current_time: Number(audioContext.currentTime) || 0,
    duration: Number(audioContext.duration) || 0,
    paused: Boolean(audioContext.paused)
  });
  emitProgress();
  if (audioKind === 'background' && currentState.isLoaded) {
    emitStatus(
      audioContext.paused ? 'paused' : 'playing',
      audioContext.paused ? '已暂停' : '正在播放',
      { isLoading: false, isLoaded: true }
    );
  }
  return getState();
}

function releaseAudio() {
  destroyContext();
  currentState = {
    isLoading: false,
    isLoaded: false,
    error: null,
    sourceType: currentSourceType,
    playerType: 'none',
    variantId: currentVariant.id,
    status: 'idle'
  };
  loadingRef = false;
  shouldPlayOnReady = false;
  fallbackAttempted = false;
  setCallbacks({});
}

function getState() {
  return {
    ...currentState,
    variant: currentVariant,
    currentTime: audioContext ? Number(audioContext.currentTime) || 0 : 0,
    duration: audioContext ? Number(audioContext.duration) || 0 : 0,
    paused: audioContext ? Boolean(audioContext.paused) : true,
    cache: guidedAudioCache.getState(currentVariant)
  };
}

function getDiagnostics() {
  return {
    ...diagnostics,
    current_state: getState()
  };
}

module.exports = {
  preload,
  selectVariant,
  load,
  play,
  pause,
  seek,
  retry,
  handleBackground,
  handleForeground,
  releaseAudio,
  getState,
  getDiagnostics,
  getVariant: () => currentVariant
};
