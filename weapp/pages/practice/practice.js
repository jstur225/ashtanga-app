const dataRepository = require('../../services/data-repository');
const practiceSession = require('../../services/practice-session');
const {
  getTodayPracticeCount
} = require('../../services/practice-options');

Page({
  data: {
    loading: true,
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
    colorLevels: [1, 2, 3, 4],
    savingCompletion: false,
    showCustomOption: false,
    customOptionLabel: '',
    customOptionNotes: '',
    customOptionColorLevel: 3,
    savingCustomOption: false
  },

  onLoad() {
    this.setToday();
  },

  onShow() {
    this.syncTabBar();
    const hasPendingCompletion = this.restorePendingCompletion();
    if (hasPendingCompletion) {
      this.loadPage();
      return;
    }
    if (!this.restorePracticeSession()) {
      this.loadPage();
    }
  },

  onHide() {
    this.stopTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  syncTabBar() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0,
        hidden: this.data.isPracticing || this.data.showCompletion
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

  async loadPage() {
    this.setData({ loading: true, error: '' });
    try {
      const { startDate, endDate } = this.getCurrentMonthRange();
      const [userOptions, todayCount, formRecords] = await Promise.all([
        dataRepository.getPracticeOptions(),
        getTodayPracticeCount(),
        dataRepository.getRecordsByDateRange(startDate, endDate)
      ]);
      this.setData({
        practiceOptions: [
          {
            id: 'chant_switch',
            label: '开篇唱诵',
            notes: this.data.chantEnabled ? '开' : '关',
            isFixed: true
          },
          {
            id: 'guided_audio',
            label: '一序列',
            notes: '老掌门人版口令',
            isFixed: true,
            hasAudio: true,
            audioIcon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTdBNDQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTEgNSA2IDlIMnY2aDRsNSA0eiIvPjxwYXRoIGQ9Ik0xNS41NCA4LjQ2YTUgNSAwIDAgMSAwIDcuMDciLz48cGF0aCBkPSJNMTkuMDcgNC45M2ExMCAxMCAwIDAgMSAwIDE0LjE0Ii8+PC9zdmc+',
            audioIconSelected: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTEgNSA2IDlIMnY2aDRsNSA0eiIvPjxwYXRoIGQ9Ik0xNS41NCA4LjQ2YTUgNSAwIDAgMSAwIDcuMDciLz48cGF0aCBkPSJNMTkuMDcgNC45M2ExMCAxMCAwIDAgMSAwIDE0LjE0Ii8+PC9zdmc+'
          },
          {
            id: 'today_count',
            label: String(todayCount),
            notes: '今日练习人数',
            isFixed: true,
            isCount: true
          },
          ...userOptions,
          {
            id: 'custom',
            label: '+ 自定义',
            notes: '',
            isCustomButton: true
          }
        ],
        formRecords,
        todayCount: String(todayCount)
      });
    } catch (error) {
      this.setData({
        error: error.message || '练习选项读取失败，请稍后重试'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onOptionTap(event) {
    const option = event.currentTarget.dataset.option;
    if (!option) return;

    if (option.id === 'chant_switch') {
      const chantEnabled = !this.data.chantEnabled;
      const practiceOptions = this.data.practiceOptions.map((item) => (
        item.id === 'chant_switch'
          ? { ...item, notes: chantEnabled ? '开' : '关' }
          : item
      ));
      this.setData({ chantEnabled, practiceOptions });
      return;
    }

    if (option.id === 'today_count') {
      this.loadPage();
      return;
    }

    if (option.id === 'custom') {
      const editableOptions = this.data.practiceOptions.filter((item) => (
        !item.isFixed && !item.isCustomButton
      ));
      if (editableOptions.length >= 3) {
        wx.showToast({ title: '免费版最多 3 个练习类型', icon: 'none' });
        return;
      }
      this.setData({
        showCustomOption: true,
        customOptionLabel: '',
        customOptionNotes: '',
        customOptionColorLevel: 3
      });
      return;
    }

    this.setData({
      selectedOptionId: this.data.selectedOptionId === option.id ? '' : option.id
    });
  },

  onStartPractice() {
    if (!this.data.selectedOptionId) {
      return;
    }
    const option = this.data.practiceOptions.find(
      (item) => item.id === this.data.selectedOptionId
    );
    if (!option) return;
    const activePractice = practiceSession.start(option);
    this.setData({
      isPracticing: true,
      isPaused: false,
      activePractice,
      elapsedSeconds: 0,
      elapsedMinutesText: '0',
      elapsedRemainderText: '00',
      showEndConfirm: false
    });
    this.setTabBarHidden(true);
    this.startTimer();
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
    return true;
  },

  restorePendingCompletion() {
    const finalSession = practiceSession.getPendingCompletion();
    if (!finalSession) return false;
    const elapsedSeconds = Number(finalSession.elapsedSeconds) || 0;
    this.setData({
      isPracticing: false,
      showCompletion: true,
      finalSession,
      completionForm: finalSession.completionForm || this.buildCompletionForm(finalSession),
      elapsedSeconds,
      ...this.formatElapsed(elapsedSeconds)
    });
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
    }
  },

  requestEndPractice() {
    const pausedBeforeEnd = this.data.isPaused;
    if (!this.data.isPaused) {
      const activePractice = practiceSession.pause();
      this.stopTimer();
      this.setData({ isPaused: true, activePractice });
    }
    this.setData({ showEndConfirm: true, pausedBeforeEnd });
  },

  cancelEndPractice() {
    this.setData({ showEndConfirm: false });
    if (!this.data.pausedBeforeEnd) {
      const activePractice = practiceSession.resume();
      this.setData({ isPaused: false, activePractice });
      this.startTimer();
    }
  },

  confirmEndPractice() {
    const finalSession = practiceSession.finish();
    if (!finalSession) return;
    this.stopTimer();
    this.setData({
      isPracticing: false,
      showEndConfirm: false,
      showCompletion: true,
      finalSession,
      elapsedSeconds: Number(finalSession.elapsedSeconds) || 0,
      ...this.formatElapsed(Number(finalSession.elapsedSeconds) || 0),
      completionForm: this.buildCompletionForm(finalSession)
    });
    this.setTabBarHidden(true);
  },

  discardPractice() {
    practiceSession.discard();
    this.stopTimer();
    this.setData({
      isPracticing: false,
      isPaused: false,
      showEndConfirm: false,
      activePractice: null,
      elapsedSeconds: 0
    });
    this.setTabBarHidden(false);
  },

  onCompletionFormChange(event) {
    const completionForm = event.detail;
    this.setData({ completionForm });
    practiceSession.updatePendingCompletion({ completionForm });
  },

  closeCustomOption() {
    if (!this.data.savingCustomOption) {
      this.setData({ showCustomOption: false });
    }
  },

  onCustomOptionInput(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value
    });
  },

  selectCustomOptionColor(event) {
    this.setData({
      customOptionColorLevel: Number(event.currentTarget.dataset.level) || 3
    });
  },

  async saveCustomOption() {
    const label = this.data.customOptionLabel.trim();
    if (!label) {
      wx.showToast({ title: '请输入练习名称', icon: 'none' });
      return;
    }
    this.setData({ savingCustomOption: true });
    try {
      await dataRepository.addPracticeOption({
        label,
        notes: this.data.customOptionNotes.trim(),
        color_level: this.data.customOptionColorLevel
      });
      this.setData({ showCustomOption: false });
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
    this.setData({ savingCompletion: true });
    const finalSession = this.data.finalSession;
    const startedAt = new Date(finalSession.startedAt);
    const form = event && event.detail && event.detail.date
      ? event.detail
      : this.data.completionForm;
    try {
      await dataRepository.createRecord({
        date: form.date,
        type: form.type,
        duration: Math.max(0, Number(form.durationMinutes) || 0) * 60,
        notes: String(form.notes || '').trim() || '今日练习完成',
        breakthrough: String(form.breakthrough || '').trim() || null,
        color_level: Number(form.color_level) || 3,
        photos: Array.isArray(form.photos) ? form.photos : [],
        start_time: startedAt.toISOString()
      });
      practiceSession.clearPendingCompletion();
      this.setData({
        showCompletion: false,
        finalSession: null,
        completionForm: null,
        selectedOptionId: ''
      });
      this.setTabBarHidden(false);
      wx.showToast({ title: '记录已保存', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/journal/journal' });
      }, 350);
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

  preventBubble() {}
});
