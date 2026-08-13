const dataRepository = require('../../services/data-repository');
const auth = require('../../services/auth');
const practiceSession = require('../../services/practice-session');
const chantPlayback = require('../../services/chant-playback');
const guidedAudio = require('../../services/guided-audio');
const membershipService = require('../../services/membership');
const membershipPolicy = require('../../services/membership-policy');
const runtimeErrors = require('../../services/runtime-errors');
const pageRefreshGate = require('../../services/page-refresh-gate');
const { checkText } = require('../../services/content-filter');
const {
  getTodayPracticeCount
} = require('../../services/practice-options');

const TODAY_COUNT_CACHE_KEY = 'weapp_today_practice_count_v1';

// 双击检测（300ms 内同选项）
let lastTap = null;

Page({
  data: {
    loading: false,
    error: '',
    todayLabel: '',
    practiceOptions: [],
    selectedOptionId: '',
    chantEnabled: false,
    todayCount: '--',
    isPracticing: false,
    isPaused: false,
    elapsedSeconds: 0,
    elapsedMinutesText: '0',
    elapsedRemainderText: '00',
    activePractice: null,
    showEndConfirm: false,
    pausedBeforeEnd: false,
    showCompletion: false,
    finalSession: null,
    completionForm: null,
    formRecords: [],
    isPro: false,
    photoEnabled: false,
    maxPhotos: membershipPolicy.FREE.maxPhotosPerRecord,
    maxPracticeOptions: membershipPolicy.FREE.maxPracticeOptions,
    colorLevelOptions: membershipPolicy.buildColorLevelOptions(false),
    savingCompletion: false,
    completionDraftPreparing: false,
    completionPhotoUploading: false,
    showCustomOption: false,
    customOptionLabel: '',
    customOptionNotes: '',
    customOptionColorLevel: 3,
    savingCustomOption: false,
    showEditOption: false,
    editingOption: null,
    editOptionLabel: '',
    editOptionNotes: '',
    editOptionColorLevel: 3,
    savingEditOption: false,
    // 唱诵
    chantDelaySeconds: 60,
    chantCountdown: 0,
    isChantPlaying: false,
    showChantSettings: false,
    chantSettingsMins: 1,
    chantSettingsSecs: 0,
    // 口令跟练
    guidedAudioLoading: false,
    guidedAudioLoaded: false,
    guidedAudioError: null,
    guidedAudioProgress: 0,
    guidedAudioCurrentTime: 0,
    guidedAudioDuration: 0,
    guidedAudioCurrentText: '00:00',
    guidedAudioDurationText: '00:00',
    guidedAudioSeekStep: 15,
    guidedAudioLoadingText: '正在准备口令音频…',
    showMembershipPrompt: false,
    membershipPromptReason: 'options_full'
  },

  onLoad() {
    const trace = runtimeErrors.startTrace('page', 'practice_cache_render');
    this.setToday();
    this.hydrateFromCache();
    runtimeErrors.finishTrace(trace, 'success', {
      option_count: this.data.practiceOptions.length,
      record_count: this.data.formRecords.length
    });
    guidedAudio.preload();
  },

  onShow() {
    this.syncTabBar();
    const storedSession = practiceSession.getSession();
    if (!storedSession || storedSession.optionId === 'guided_audio') {
      guidedAudio.preload();
    }
    const hasPendingCompletion = this.restorePendingCompletion();
    if (hasPendingCompletion) {
      pageRefreshGate.run(this.getRefreshGateKey(), () => this.loadPage(), { force: true }).catch(() => null);
      return;
    }
    if (!this.restorePracticeSession()) {
      pageRefreshGate.run(this.getRefreshGateKey(), () => this.loadPage()).catch(() => null);
    }
  },

  getRefreshGateKey() {
    const session = auth.getStoredSession();
    const userId = session && session.user ? session.user.id || 'account' : 'guest';
    return `practice:${dataRepository.getMode()}:${userId}`;
  },

  onHide() {
    this.stopTimer();
    chantPlayback.stopAll();
    guidedAudio.releaseAudio();
  },

  onUnload() {
    this.stopTimer();
    chantPlayback.stopAll();
    guidedAudio.releaseAudio();
  },

  syncTabBar() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0,
        hidden: this.data.isPracticing || this.data.showCompletion || this.data.showCustomOption || this.data.showEditOption || this.data.showEndConfirm || this.data.showChantSettings || this.data.showMembershipPrompt
      });
    }
  },

  setToday() {
    const now = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    this.setData({
      todayLabel: `${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${weekdays[now.getDay()]}`
    });
  },

  buildPracticePageData(userOptions, todayCount, membership) {
    const capabilities = membershipPolicy.getCapabilities(membership);
    const isPro = capabilities.tier === 'pro';
    const safeChantDelay = membershipPolicy.clampChantDelay(this.data.chantDelaySeconds, membership);
    const decoratedUserOptions = (Array.isArray(userOptions) ? userOptions : []).map((option, index) => ({
      ...option,
      membershipLocked: !isPro && index >= capabilities.maxPracticeOptions
    }));
    return {
      isPro,
      photoEnabled: dataRepository.getMode() === 'cloud',
      maxPhotos: capabilities.maxPhotosPerRecord,
      maxPracticeOptions: capabilities.maxPracticeOptions,
      colorLevelOptions: membershipPolicy.buildColorLevelOptions(membership),
      chantDelaySeconds: safeChantDelay,
      practiceOptions: [
        {
          id: 'chant_switch',
          label: '开篇唱诵',
          notes: this.data.chantEnabled ? `${safeChantDelay}秒后播放` : '关',
          isFixed: true
        },
        {
          id: 'guided_audio',
          label: '一序列',
          notes: '老掌门人版口令',
          isFixed: true,
          isPreset: true,
          hasAudio: true,
          audioIcon: '/images/icons/practice-volume.png',
          audioIconSelected: '/images/icons/practice-volume-selected.png'
        },
        {
          id: 'today_count',
          label: todayCount === null || todayCount === undefined || todayCount === '' ? '--' : String(todayCount),
          notes: '今日练习人数',
          isFixed: true,
          isCount: true
        },
        ...decoratedUserOptions,
        {
          id: 'custom',
          label: '+ 自定义',
          notes: '',
          isCustomButton: true
        }
      ]
    };
  },

  hydrateFromCache() {
    const { startDate, endDate } = this.getCurrentMonthRange();
    const session = auth.getStoredSession();
    const membership = membershipService.getCachedStatus(session) || membershipService.EMPTY_STATUS;
    const cachedTodayCount = wx.getStorageSync(TODAY_COUNT_CACHE_KEY);
    const hasCachedTodayCount = cachedTodayCount !== '' && cachedTodayCount !== undefined && cachedTodayCount !== null;
    const todayCount = hasCachedTodayCount ? cachedTodayCount : this.data.todayCount;
    this.setData({
      ...this.buildPracticePageData(dataRepository.getCachedPracticeOptions(), todayCount, membership),
      formRecords: dataRepository.getCachedRecordsByDateRange(startDate, endDate),
      todayCount: String(todayCount),
      loading: false,
      error: ''
    });
  },

  async loadPage(options = {}) {
    const trace = runtimeErrors.startTrace('page', 'practice_background_refresh');
    const isFirstLoad = this.data.practiceOptions.length === 0;
    if (isFirstLoad) this.setData({ loading: true, error: '' });
    try {
      const { startDate, endDate } = this.getCurrentMonthRange();
      const [userOptions, todayCount, formRecords, membership] = await Promise.all([
        dataRepository.getPracticeOptions(),
        getTodayPracticeCount({ force: Boolean(options.forceTodayCount) })
          .catch(() => Number(this.data.todayCount) || 0),
        dataRepository.getRecordsByDateRange(startDate, endDate),
        membershipService.getMembershipStatus().catch(() => ({ ...membershipService.EMPTY_STATUS }))
      ]);
      wx.setStorageSync(TODAY_COUNT_CACHE_KEY, todayCount);
      this.setData({
        ...this.buildPracticePageData(userOptions, todayCount, membership),
        formRecords,
        todayCount: String(todayCount),
        error: ''
      });
      runtimeErrors.finishTrace(trace, 'success', {
        option_count: userOptions.length,
        record_count: formRecords.length
      });
    } catch (error) {
      runtimeErrors.finishTrace(trace, 'error', { message: error && error.message });
      if (this.data.practiceOptions.length === 0) {
        this.setData({ error: error.message || '练习选项读取失败，请稍后重试' });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  onOptionTap(event) {
    const option = event.currentTarget.dataset.option;
    if (!option) return;

    if (option.membershipLocked) {
      this.showMembershipLimit('locked_option');
      return;
    }

    const now = Date.now();

    // === 双击检测（300ms 内同选项）===
    if (lastTap && lastTap.id === option.id && now - lastTap.time < 300) {
      lastTap = null;
      // 固定按钮双击
      if (option.isFixed) {
        if (option.id === 'chant_switch') {
          const delay = this.data.chantDelaySeconds;
          this.setData({
            showChantSettings: true,
            chantSettingsMins: Math.floor(delay / 60),
            chantSettingsSecs: delay % 60
          }, () => this.setTabBarHidden(true));
        } else if (option.isPreset) {
          wx.showToast({ title: '预设按钮暂不支持编辑，中文口令开发中。', icon: 'none' });
        }
        return;
      }
      // 用户自定义选项：打开编辑弹窗
      if (option.id !== 'custom') {
        this.openEditOption(option);
      }
      return;
    }

    // === 单击 ===
    lastTap = { id: option.id, time: now };

    if (option.id === 'chant_switch') {
      const chantEnabled = !this.data.chantEnabled;
      const chantNotes = chantEnabled ? `${this.data.chantDelaySeconds}秒后播放` : '关';
      const practiceOptions = this.data.practiceOptions.map((item) => (
        item.id === 'chant_switch'
          ? { ...item, notes: chantNotes }
          : item
      ));
      const nextData = { chantEnabled, practiceOptions };
      if (chantEnabled && this.data.selectedOptionId === 'guided_audio') {
        nextData.selectedOptionId = '';
        guidedAudio.releaseAudio();
        wx.showToast({ title: '口令包含唱诵，不能同时开启', icon: 'none' });
      }
      this.setData(nextData);
      return;
    }

    if (option.id === 'today_count') {
      this.loadPage({ forceTodayCount: true });
      wx.showToast({ title: '今天你熬汤了吗？', icon: 'none' });
      return;
    }

    if (option.id === 'custom') {
      const editableOptions = this.data.practiceOptions.filter((item) => (
        !item.isFixed && !item.isCustomButton
      ));
      if (editableOptions.length >= this.data.maxPracticeOptions) {
        this.showMembershipLimit('options_full');
        return;
      }
      this.setData({
        showCustomOption: true,
        customOptionLabel: '',
        customOptionNotes: '',
        customOptionColorLevel: 3
      }, () => this.setTabBarHidden(true));
      return;
    }

    const isDeselecting = this.data.selectedOptionId === option.id;
    const nextData = {
      selectedOptionId: isDeselecting ? '' : option.id
    };

    if (option.id === 'guided_audio') {
      if (isDeselecting) {
        guidedAudio.releaseAudio();
      } else {
        if (this.data.chantEnabled) {
          nextData.chantEnabled = false;
          nextData.practiceOptions = this.data.practiceOptions.map((item) => (
            item.id === 'chant_switch' ? { ...item, notes: '关' } : item
          ));
          wx.showToast({ title: '口令包含唱诵，不能同时开启', icon: 'none' });
        }
        guidedAudio.preload();
      }
    }

    this.setData(nextData);
  },

  onStartPractice() {
    if (!this.data.selectedOptionId) {
      return;
    }
    const option = this.data.practiceOptions.find(
      (item) => item.id === this.data.selectedOptionId
    );
    if (!option) return;

    // 唱诵与口令跟练不可同时使用
    if (this.data.chantEnabled && option.id === 'guided_audio') {
      wx.showToast({ title: '口令包含唱诵，不能同时开启', icon: 'none' });
      return;
    }

    const isGuidedAudio = option.id === 'guided_audio';
    const activePractice = practiceSession.start(option, Date.now(), isGuidedAudio);
    this.setData({
      isPracticing: true,
      isPaused: isGuidedAudio,
      activePractice,
      elapsedSeconds: 0,
      elapsedMinutesText: '0',
      elapsedRemainderText: '00',
      showEndConfirm: false,
      chantCountdown: 0,
      isChantPlaying: false
    });
    this.setTabBarHidden(true);

    // 口令跟练模式：初始为暂停状态，等待音频加载完成后恢复计时
    if (isGuidedAudio) {
      this.loadGuidedAudio();
      return;
    }

    // 普通模式：立即开始计时
    this.startTimer();

    // 唱诵模式：倒计时 → 唱诵 → 自动重置计时器
    if (this.data.chantEnabled) {
      chantPlayback.startCountdown(this.data.chantDelaySeconds, {
        onPlay: (state) => {
          if (state.countdown !== undefined) {
            this.setData({ chantCountdown: state.countdown });
          }
          if (state.playing) {
            this.setData({ isChantPlaying: true, chantCountdown: 0 });
          }
        },
        onFinish: () => {
          this.setData({ isChantPlaying: false });
          practiceSession.restartTimer(Date.now());
          const session = practiceSession.getSession();
          if (session) {
            const elapsedSeconds = practiceSession.getElapsedSeconds(session);
            this.setData({
              elapsedSeconds,
              ...this.formatElapsed(elapsedSeconds)
            });
          }
        }
      });
    }
  },

  restorePracticeSession() {
    const activePractice = practiceSession.getSession();
    if (!activePractice) return false;
    const elapsedSeconds = practiceSession.getElapsedSeconds(activePractice);
    this.setData({
      isPracticing: true,
      isPaused: Boolean(activePractice.paused),
      activePractice,
      elapsedSeconds,
      ...this.formatElapsed(elapsedSeconds)
    });
    this.setTabBarHidden(true);
    if (!activePractice.paused) this.startTimer();

    // 恢复口令跟练时自动加载音频（如果是暂停状态，加载后不自动恢复计时）
    if (activePractice.optionId === 'guided_audio') {
      const wasPaused = Boolean(activePractice.paused);
      this.loadGuidedAudio(wasPaused);
    }

    return true;
  },

  restorePendingCompletion() {
    const finalSession = practiceSession.getPendingCompletion();
    if (!finalSession) return false;
    const elapsedSeconds = Number(finalSession.elapsedSeconds) || 0;
    const completionForm = finalSession.completionForm || this.buildCompletionForm(finalSession);
    this.setData({
      isPracticing: false,
      showCompletion: true,
      finalSession,
      completionForm,
      elapsedSeconds,
      ...this.formatElapsed(elapsedSeconds)
    }, () => this.prepareCompletionDraft());
    this.setTabBarHidden(true);
    return true;
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      const activePractice = practiceSession.getSession();
      if (!activePractice) {
        this.stopTimer();
        return;
      }
      const elapsedSeconds = practiceSession.getElapsedSeconds(activePractice);
      this.setData({
        elapsedSeconds,
        ...this.formatElapsed(elapsedSeconds)
      });
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  formatElapsed(elapsedSeconds) {
    return {
      elapsedMinutesText: String(Math.floor(elapsedSeconds / 60)),
      elapsedRemainderText: String(elapsedSeconds % 60).padStart(2, '0')
    };
  },

  togglePause() {
    if (this.data.isPaused) {
      const activePractice = practiceSession.resume();
      this.setData({ isPaused: false, activePractice });
      this.startTimer();
      if (this.data.guidedAudioLoaded) guidedAudio.play();
    } else {
      const activePractice = practiceSession.pause();
      const elapsedSeconds = practiceSession.getElapsedSeconds(activePractice);
      this.stopTimer();
      this.setData({
        isPaused: true,
        activePractice,
        elapsedSeconds,
        ...this.formatElapsed(elapsedSeconds)
      });
      if (this.data.guidedAudioLoaded) guidedAudio.pause();
    }
  },

  requestEndPractice() {
    const pausedBeforeEnd = this.data.isPaused;
    if (!this.data.isPaused) {
      const activePractice = practiceSession.pause();
      this.stopTimer();
      this.setData({ isPaused: true, activePractice });
    }
    this.setData({ showEndConfirm: true, pausedBeforeEnd }, () => this.setTabBarHidden(true));
  },

  cancelEndPractice() {
    this.setData({ showEndConfirm: false });
    if (!this.data.pausedBeforeEnd) {
      const activePractice = practiceSession.resume();
      this.setData({ isPaused: false, activePractice });
      this.startTimer();
      if (this.data.guidedAudioLoaded) guidedAudio.play();
    }
  },

  confirmEndPractice() {
    const finalSession = practiceSession.finish();
    if (!finalSession) return;
    chantPlayback.stopAll();
    guidedAudio.releaseAudio();
    this.stopTimer();
    this.setData({
      isPracticing: false,
      showEndConfirm: false,
      showCompletion: true,
      finalSession,
      elapsedSeconds: Number(finalSession.elapsedSeconds) || 0,
      ...this.formatElapsed(Number(finalSession.elapsedSeconds) || 0),
      completionForm: this.buildCompletionForm(finalSession)
    }, () => this.prepareCompletionDraft());
    this.setTabBarHidden(true);
  },

  discardPractice() {
    chantPlayback.stopAll();
    guidedAudio.releaseAudio();
    practiceSession.discard();
    this.stopTimer();
    this.setData({
      isPracticing: false,
      isPaused: false,
      showEndConfirm: false,
      activePractice: null,
      elapsedSeconds: 0,
      chantCountdown: 0,
      isChantPlaying: false
    });
    this.setTabBarHidden(false);
  },

  onCompletionFormChange(event) {
    const completionForm = event.detail;
    this.setData({ completionForm });
    practiceSession.updatePendingCompletion({ completionForm });
  },

  onCompletionPhotoUploadState(event) {
    this.setData({ completionPhotoUploading: Boolean(event.detail && event.detail.uploading) });
  },

  async prepareCompletionDraft() {
    if (dataRepository.getMode() !== 'cloud') return null;
    if (this.data.completionDraftPreparing) return null;
    const form = this.data.completionForm;
    const finalSession = this.data.finalSession;
    if (!form || !finalSession || form.id) return form && form.id ? form.id : null;
    this.setData({ completionDraftPreparing: true });
    try {
      const draft = await dataRepository.createRecord({
        date: form.date,
        type: '草稿',
        duration: Math.max(0, Number(form.durationMinutes) || 0) * 60,
        notes: '',
        breakthrough: null,
        color_level: Number(form.color_level) || 3,
        photos: [],
        start_time: new Date(finalSession.startedAt).toISOString()
      });
      const nextForm = {
        ...(this.data.completionForm || form),
        id: draft.id,
        isDraft: true
      };
      this.setData({ completionForm: nextForm });
      practiceSession.updatePendingCompletion({ completionForm: nextForm });
      return draft.id;
    } catch (error) {
      wx.showToast({ title: error.message || '照片功能准备失败', icon: 'none' });
      return null;
    } finally {
      this.setData({ completionDraftPreparing: false });
    }
  },

  closeCustomOption() {
    if (!this.data.savingCustomOption) {
      this.setData({ showCustomOption: false });
      this.setTabBarHidden(false);
    }
  },

  onCustomOptionInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value
    });
  },

  selectCustomOptionColor(event) {
    const level = Number(event.currentTarget.dataset.level) || 3;
    if (!membershipPolicy.isColorLevelAllowed(level, this.data.isPro)) {
      this.showMembershipLimit('color_level');
      return;
    }
    this.setData({
      customOptionColorLevel: level
    });
  },

  // === 双击编辑练习选项 ===

  openEditOption(option) {
    this.setData({
      showEditOption: true,
      editingOption: option,
      editOptionLabel: option.label || '',
      editOptionNotes: option.notes || '',
      editOptionColorLevel: Number(option.color_level) || 3
    }, () => this.setTabBarHidden(true));
  },

  closeEditOption() {
    if (!this.data.savingEditOption) {
      this.setData({
        showEditOption: false,
        editingOption: null
      });
      this.setTabBarHidden(false);
    }
  },

  onEditOptionInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value
    });
  },

  selectEditOptionColor(event) {
    const level = Number(event.currentTarget.dataset.level) || 3;
    if (!membershipPolicy.isColorLevelAllowed(level, this.data.isPro)) {
      this.showMembershipLimit('color_level');
      return;
    }
    this.setData({
      editOptionColorLevel: level
    });
  },

  async saveEditOption() {
    const label = this.data.editOptionLabel.trim();
    if (!label) {
      wx.showToast({ title: '请输入练习名称', icon: 'none' });
      return;
    }
    const option = this.data.editingOption;
    if (!option) return;

    const editLabelCheck = checkText(label);
    const editNotesCheck = String(this.data.editOptionNotes || '').trim() ? checkText(String(this.data.editOptionNotes || '').trim()) : null;
    if (!editLabelCheck.ok || (editNotesCheck && !editNotesCheck.ok)) {
      wx.showToast({ title: '内容包含不当词汇，请修改后重试', icon: 'none' });
      return;
    }

    this.setData({ savingEditOption: true });
    try {
      await dataRepository.updatePracticeOption(option.id, {
        label,
        notes: this.data.editOptionNotes.trim(),
        color_level: membershipPolicy.normalizeColorLevel(this.data.editOptionColorLevel, this.data.isPro)
      });
      this.setData({ showEditOption: false, editingOption: null });
      this.setTabBarHidden(false);
      await this.loadPage();
      wx.showToast({ title: '已保存修改', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ savingEditOption: false });
    }
  },

  async deleteEditOption() {
    const option = this.data.editingOption;
    if (!option) return;

    // 检查剩余选项数
    const remaining = this.data.practiceOptions.filter(
      (item) => !item.isFixed && !item.isCustomButton && item.id !== option.id
    );
    if (remaining.length < 2) {
      wx.showToast({ title: '至少需要保留 2 个练习选项', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '删除练习类型？',
      content: `确定要删除「${option.label}」吗？`,
      confirmText: '删除',
      confirmColor: '#A34837',
      success: async (result) => {
        if (!result.confirm) return;
        this.setData({ savingEditOption: true });
        try {
          await dataRepository.deletePracticeOption(option.id);
          this.setData({ showEditOption: false, editingOption: null });
          this.setTabBarHidden(false);
          if (this.data.selectedOptionId === option.id) {
            this.setData({ selectedOptionId: '' });
          }
          await this.loadPage();
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (error) {
          wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        } finally {
          this.setData({ savingEditOption: false });
        }
      }
    });
  },

  async saveCustomOption() {
    if (this.data.savingCustomOption) return;
    const label = this.data.customOptionLabel.trim();
    if (!label) {
      wx.showToast({ title: '请输入练习名称', icon: 'none' });
      return;
    }
    const customLabelCheck = checkText(label);
    const customNotesCheck = String(this.data.customOptionNotes || '').trim() ? checkText(String(this.data.customOptionNotes || '').trim()) : null;
    if (!customLabelCheck.ok || (customNotesCheck && !customNotesCheck.ok)) {
      wx.showToast({ title: '内容包含不当词汇，请修改后重试', icon: 'none' });
      return;
    }
    this.setData({ savingCustomOption: true });
    try {
      await dataRepository.addPracticeOption({
        label,
        notes: this.data.customOptionNotes.trim(),
        color_level: membershipPolicy.normalizeColorLevel(this.data.customOptionColorLevel, this.data.isPro)
      });
      this.setData({ showCustomOption: false });
      this.setTabBarHidden(false);
      await this.loadPage();
      wx.showToast({ title: '练习类型已添加', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '添加失败', icon: 'none' });
    } finally {
      this.setData({ savingCustomOption: false });
    }
  },

  async saveCompletion(event) {
    if (this.data.savingCompletion || !this.data.finalSession) return;
    if (this.data.completionDraftPreparing) {
      wx.showToast({ title: '正在准备练习记录，请稍候', icon: 'none' });
      return;
    }
    if (this.data.completionPhotoUploading) {
      wx.showToast({ title: '请等待照片上传完成', icon: 'none' });
      return;
    }
    this.setData({ savingCompletion: true });
    const finalSession = this.data.finalSession;
    const startedAt = new Date(finalSession.startedAt);
    const form = event && event.detail && event.detail.date
      ? event.detail
      : this.data.completionForm;
    try {
      const payload = {
        date: form.date,
        type: form.type,
        duration: Math.max(0, Number(form.durationMinutes) || 0) * 60,
        notes: String(form.notes || '').trim() || '今日练习完成',
        breakthrough: String(form.breakthrough || '').trim() || null,
        color_level: Number(form.color_level) || 3,
        photos: Array.isArray(form.photos) ? form.photos : [],
        start_time: startedAt.toISOString()
      };
      const blockedNote = checkText(payload.notes);
      const blockedBreakthrough = payload.breakthrough ? checkText(payload.breakthrough) : null;
      if (!blockedNote.ok || (blockedBreakthrough && !blockedBreakthrough.ok)) {
        wx.showToast({ title: '内容包含不当词汇，请修改后重试', icon: 'none' });
        return;
      }
      if (form.id) await dataRepository.updateRecord(form.id, payload);
      else await dataRepository.createRecord(payload);
      practiceSession.clearPendingCompletion();
      wx.showToast({ title: '记录已保存', icon: 'success' });
      wx.switchTab({
        url: '/pages/journal/journal',
        success: () => {
          this.setData({
            showCompletion: false,
            finalSession: null,
            completionForm: null,
            completionPhotoUploading: false,
            selectedOptionId: ''
          });
          this.setTabBarHidden(false);
        },
        fail: () => {
          this.setData({
            showCompletion: false,
            finalSession: null,
            completionForm: null,
            completionPhotoUploading: false,
            selectedOptionId: ''
          });
          this.setTabBarHidden(false);
          wx.showToast({ title: '记录已保存，请前往觉察日记查看', icon: 'none' });
        }
      });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ savingCompletion: false });
    }
  },

  setTabBarHidden(hidden) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden });
    }
  },

  buildCompletionForm(finalSession) {
    const startedAt = new Date(finalSession.startedAt || Date.now());
    const elapsedSeconds = Number(finalSession.elapsedSeconds) || 0;
    return {
      date: this.formatDate(startedAt.getFullYear(), startedAt.getMonth() + 1, startedAt.getDate()),
      type: finalSession.label || '',
      durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      notes: finalSession.completionForm && finalSession.completionForm.notes
        ? finalSession.completionForm.notes
        : '',
      breakthrough: finalSession.completionForm && finalSession.completionForm.breakthrough
        ? finalSession.completionForm.breakthrough
        : '',
      breakthroughEnabled: Boolean(
        finalSession.completionForm
        && (finalSession.completionForm.breakthroughEnabled || finalSession.completionForm.breakthrough)
      ),
      color_level: Number(finalSession.color_level) || 3,
      photos: finalSession.completionForm && Array.isArray(finalSession.completionForm.photos)
        ? finalSession.completionForm.photos
        : []
    };
  },

  getCurrentMonthRange() {
    const now = new Date();
    return {
      startDate: this.formatDate(now.getFullYear(), now.getMonth() + 1, 1),
      endDate: this.formatDate(now.getFullYear(), now.getMonth() + 1, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
    };
  },

  formatDate(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },

  preventBubble() {},

  // === 口令跟练音频 ===

  loadGuidedAudio(suppressResume = false) {
    this.setData({
      guidedAudioLoading: true,
      guidedAudioLoaded: false,
      guidedAudioError: null,
      guidedAudioProgress: 0,
      guidedAudioCurrentTime: 0,
      guidedAudioDuration: 0,
      guidedAudioCurrentText: '00:00',
      guidedAudioDurationText: '00:00',
      guidedAudioLoadingText: guidedAudio.getState().sourceType === 'local'
        ? '正在读取已缓存口令音频…'
        : '首次加载口令音频，后续将自动加速'
    });
    guidedAudio.load({
      onStatus: ({ status, text }) => {
        const nextState = {};
        if (text) nextState.guidedAudioLoadingText = text;
        if (status === 'buffering') nextState.guidedAudioLoading = true;
        if (status === 'playing' || status === 'ready') nextState.guidedAudioLoading = false;
        if (Object.keys(nextState).length > 0) this.setData(nextState);
      },
      onReady: () => {
        this.setData({
          guidedAudioLoading: false,
          guidedAudioLoaded: true,
          guidedAudioError: null
        });
        // ⭐ 音频就绪 → 恢复练习计时（对应 WebApp onReady: resumePracticeSession）
        // 只有在非恢复模式下才自动恢复
        if (!suppressResume) {
          this.setData({ isPaused: false });
          const activePractice = practiceSession.resume(Date.now());
          if (activePractice) {
            this.setData({ activePractice });
          }
          this.startTimer();
        }
      },
      onEnded: () => {
        this.requestEndPractice();
      },
      onTimeUpdate: ({ currentTime, duration, progress }) => {
        this.setData({
          guidedAudioCurrentTime: currentTime,
          guidedAudioDuration: duration,
          guidedAudioCurrentText: this.formatAudioTime(currentTime),
          guidedAudioDurationText: this.formatAudioTime(duration),
          guidedAudioProgress: progress
        });
      },
      onError: () => {
        this.setData({
          guidedAudioLoading: false,
          guidedAudioLoaded: false,
          guidedAudioError: '音频播放失败，请重试'
        });
      }
    });
  },

  onRetryGuidedAudio() {
    this.loadGuidedAudio();
  },

  onAudioSeek(event) {
    const direction = event.currentTarget.dataset.direction;
    guidedAudio.seek(direction, this.data.guidedAudioSeekStep);
  },

  onSeekStepChange(event) {
    const step = Number(event.currentTarget.dataset.step) || 15;
    this.setData({ guidedAudioSeekStep: step });
  },

  formatAudioTime(seconds) {
    if (!seconds || Number.isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  // === 唱诵设置 ===

  openChantSettings() {
    const delay = this.data.chantDelaySeconds;
    this.setData({
      showChantSettings: true,
      chantSettingsMins: Math.floor(delay / 60),
      chantSettingsSecs: delay % 60
    }, () => this.setTabBarHidden(true));
  },

  closeChantSettings() {
    if (!this.data.showChantSettings) return;
    if (this.data.isPro) {
      const totalSeconds = this.data.chantSettingsMins * 60 + this.data.chantSettingsSecs;
      const delay = membershipPolicy.clampChantDelay(totalSeconds, true);
      this.setData({
        chantDelaySeconds: delay,
        chantSettingsMins: Math.floor(delay / 60),
        chantSettingsSecs: delay % 60,
        showChantSettings: false
      });
    } else {
      this.setData({
        chantDelaySeconds: membershipPolicy.FREE.defaultChantDelaySeconds,
        chantSettingsMins: 1,
        chantSettingsSecs: 0,
        showChantSettings: false
      });
    }
    this.setTabBarHidden(false);
  },

  onChantStep(event) {
    if (!this.data.isPro) return;
    const field = event.currentTarget.dataset.field;
    const delta = Number(event.currentTarget.dataset.delta) || 0;
    if (field === 'minutes') {
      this.setData({ chantSettingsMins: Math.min(180, Math.max(0, this.data.chantSettingsMins + delta)) });
    } else {
      this.setData({ chantSettingsSecs: Math.min(59, Math.max(0, this.data.chantSettingsSecs + delta)) });
    }
  },

  onChantUpgrade() {
    this.showMembershipLimit('chant_delay');
  },

  onChantMinsInput(event) {
    const val = parseInt(event.detail.value, 10) || 0;
    this.setData({ chantSettingsMins: Math.min(Math.max(val, 0), 180) });
  },

  onChantSecsInput(event) {
    const val = parseInt(event.detail.value, 10) || 0;
    this.setData({ chantSettingsSecs: Math.min(Math.max(val, 0), 59) });
  },

  saveChantDelay() {
    this.closeChantSettings();
  },

  showMembershipLimit(reason) {
    this.setData({
      showMembershipPrompt: true,
      membershipPromptReason: reason || 'options_full'
    }, () => this.setTabBarHidden(true));
  },

  closeMembershipPrompt() {
    this.setData({ showMembershipPrompt: false }, () => {
      this.setTabBarHidden(Boolean(
        this.data.showCompletion ||
        this.data.showCustomOption ||
        this.data.showEditOption ||
        this.data.showChantSettings
      ));
    });
  },

  openMembershipSettings() {
    this.setData({ showMembershipPrompt: false });
    wx.setStorageSync('ashtanga_profile_settings_tab', 'membership');
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  onMembershipLimit(event) {
    this.showMembershipLimit(event && event.detail ? event.detail.reason : 'color_level');
  },

  onSkipChantCountdown() {
    chantPlayback.skipCountdown({
      onPlay: (state) => {
        if (state.playing) {
          this.setData({ isChantPlaying: true, chantCountdown: 0 });
        }
      },
      onFinish: () => {
        this.setData({ isChantPlaying: false });
        practiceSession.restartTimer(Date.now());
        const session = practiceSession.getSession();
        if (session) {
          const elapsedSeconds = practiceSession.getElapsedSeconds(session);
          this.setData({
            elapsedSeconds,
            ...this.formatElapsed(elapsedSeconds)
          });
        }
      }
    });
  }
});
