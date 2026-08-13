const dataRepository = require('../../services/data-repository');
const auth = require('../../services/auth');
const localData = require('../../services/local-data');
const membershipService = require('../../services/membership');
const membershipPolicy = require('../../services/membership-policy');
const runtimeErrors = require('../../services/runtime-errors');
const pageRefreshGate = require('../../services/page-refresh-gate');
const { getMoonType, getMoonIcon } = require('../../services/moon-days');

const ICONS = {
  cloud: '/images/icons/journal-cloud.png',
  message: '/images/icons/journal-message.png',
  pencil: '/images/icons/journal-pencil.png',
  plus: '/images/icons/journal-plus.png'
};

const INVITE_VERSION = 'v1';

Page({
  data: {
    calendarLoading: true,
    calendarError: '',
    calendarTitle: '',
    calendarDays: [],
    currentYear: 0,
    currentMonth: 0,
    todayDate: '',
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    colorLevels: [1, 2, 3, 4],
    isPro: false,
    maxPhotos: membershipPolicy.FREE.maxPhotosPerRecord,
    maxPracticeOptions: membershipPolicy.FREE.maxPracticeOptions,
    maxAnnotationTypes: membershipPolicy.FREE.maxAnnotationTypes,
    monthRecords: [],
    timelineRecords: [],
    timelineLoadingMore: false,
    timelineHasMore: false,
    monthlyStats: {
      practiceDays: 0,
      totalMinutes: 0,
      avgMinutes: 0,
      consecutiveWeeks: 0
    },
    highlightedDate: '',
    moonDialog: { open: false, type: '' },
    icons: ICONS,
    practiceOptions: [],
    optionLabels: [],
    showRecordSheet: false,
    recordSheetMode: 'add',
    recordForm: {
      date: '',
      type: '',
      durationMinutes: '60',
      notes: '',
      breakthrough: '',
      color_level: 3
    },
    selectedTypeIndex: 0,
    submitLoading: false,
    draftPreparing: false,
    formPhotoUploading: false,
    dataMode: 'guest',
    syncStatus: 'idle',
    pendingSyncCount: 0,
    showAccountSync: false,
    showAuthModal: false,
    showPasswordShell: false,
    authInitialMode: 'login',
    accountEmail: '',
    maskedAccountEmail: '',
    // XHS 邀请
    showXiaohongshuModal: false,
    hasNewXhsMessage: false,
    // 标注
    showAnnotationManager: false,
    annotationTypes: [],
    showMembershipPrompt: false,
    membershipPromptReason: 'locked_annotation',
    annotationDates: {},
    annotationMap: {},
    annotationTypeIdMap: {},
    // 同步动画
    syncing: false,
    // 月度统计分享卡
    showMonthlyShare: false,
    shareCardData: {
      year: 0,
      month: 0,
      totalHours: 0,
      breathCount: 0,
      photosynthesisCount: 0,
      profileName: '阿斯汤加习练者',
      profileSignature: '练习、练习，一切随之而来。',
      profileAvatar: '',
      calendarDays: []
    },
    // 单条觉察笔记分享卡
    showRecordShare: false,
    recordShareData: {
      formattedDate: '',
      type: '',
      durationMinutes: 0,
      breakthrough: '',
      notes: '',
      thisMonthDays: 0,
      totalPracticeCount: 0,
      totalHours: 0,
      profileName: '阿斯汤加习练者',
      profileSignature: '练习、练习，一切随之而来。',
      profileAvatar: '',
      photos: []
    }
  },

  onLoad() {
    runtimeErrors.recordEvent('page', 'journal_load');
    this._olderTimelineRecords = [];
    this._timelineLoadedKeys = [];
    this._timelineFloorKey = '';
    this._timelineFloorPromise = null;
    this._timelineLoading = false;
    this.prepareTimelineFloor();
    const now = new Date();
    const readVersion = wx.getStorageSync('xhs_invite_version') || '';
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
      todayDate: this.formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate()),
      hasNewXhsMessage: readVersion !== INVITE_VERSION
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        hidden: this.data.showRecordSheet ||
          this.data.showAnnotationManager ||
          this.data.showXiaohongshuModal ||
          this.data.showMonthlyShare ||
          this.data.showRecordShare ||
          this.data.showMembershipPrompt
      });
    }
    const cacheTrace = runtimeErrors.startTrace('page', 'journal_cache_render');
    this.renderCachedCalendar();
    runtimeErrors.finishTrace(cacheTrace, 'success', {
      record_count: this.data.monthRecords.length,
      calendar_day_count: this.data.calendarDays.length
    });
    pageRefreshGate.run(this.getRefreshGateKey(), () => this.loadPage()).catch(() => null);
  },

  getRefreshGateKey() {
    const session = auth.getStoredSession();
    const userId = session && session.user ? session.user.id || 'account' : 'guest';
    return `journal:${dataRepository.getMode()}:${userId}`;
  },

  onHide() {
    this.stopPhotoSyncRefresh();
  },

  onUnload() {
    this.stopPhotoSyncRefresh();
  },

  async loadPage(options = {}) {
    const trace = runtimeErrors.startTrace('page', 'journal_background_refresh', {
      skip_background_sync: Boolean(options.skipBackgroundSync)
    });
    try {
    const dataMode = dataRepository.getMode();
    const initialSyncState = dataRepository.getRecordSyncState();
    if (options.skipBackgroundSync || dataMode !== 'cloud') {
      this.setData({
        pendingSyncCount: initialSyncState.pending,
        syncStatus: initialSyncState.pending > 0 ? 'error' : dataMode === 'cloud' ? 'success' : 'idle'
      });
    } else {
      this.runBackgroundAccountSync();
    }
    const [membership, currentUser] = await Promise.all([
      membershipService.getMembershipStatus()
        .catch(() => ({ ...membershipService.EMPTY_STATUS })),
      dataMode === 'cloud'
        ? auth.getCurrentUser().catch(() => null)
        : Promise.resolve(null)
    ]);
    const capabilities = membershipPolicy.getCapabilities(membership);
    const accountEmail = currentUser && currentUser.email ? currentUser.email : '';
    this.setData({
      dataMode,
      isPro: capabilities.tier === 'pro',
      maxPhotos: capabilities.maxPhotosPerRecord,
      maxPracticeOptions: capabilities.maxPracticeOptions,
      maxAnnotationTypes: capabilities.maxAnnotationTypes,
      accountEmail,
      maskedAccountEmail: this.maskEmail(accountEmail)
    });
    await Promise.all([
      this.loadPracticeOptions(),
      this.loadCalendar({ preserveExisting: true })
    ]);
    runtimeErrors.finishTrace(trace, 'success', {
      mode: dataMode,
      record_count: this.data.monthRecords.length,
      option_count: this.data.practiceOptions.length
    });
    } catch (error) {
      runtimeErrors.finishTrace(trace, 'error', { message: error && error.message });
      throw error;
    }
  },

  async loadAnnotationTypes() {
    try {
      const types = await dataRepository.getAnnotationTypes();
      this.setData({ annotationTypes: types });
    } catch (error) {
      // 静默失败，不影响主流程
    }
  },

  async loadAnnotationDates() {
    const { currentYear, currentMonth } = this.data;
    try {
      const [types, assignments] = await Promise.all([
        dataRepository.getAnnotationTypes(),
        dataRepository.getMonthAssignments(currentYear, currentMonth + 1)
      ]);
      const annotationState = this.buildAnnotationState(types, assignments);
      this.setData({ annotationTypes: types, ...annotationState });
      return annotationState;
    } catch (error) {
      // 静默失败
      return { annotationDates: this.data.annotationDates, annotationMap: this.data.annotationMap };
    }
  },

  async loadPracticeOptions() {
    try {
      const options = await dataRepository.getPracticeOptions();
      const validOptions = options
        .filter((option) => option.label && option.label !== '草稿')
        .map((option, index) => ({
          ...option,
          membershipLocked: !this.data.isPro && index >= this.data.maxPracticeOptions
        }));
      this.setData({
        practiceOptions: validOptions,
        optionLabels: validOptions.map((option) => option.label)
      });
    } catch (error) {
      if (!this.data.practiceOptions.length) {
        this.setData({
          practiceOptions: [{ label: '一序列', color_level: 3 }],
          optionLabels: ['一序列']
        });
      }
    }
  },

  getCurrentMonthRange() {
    const { currentYear, currentMonth } = this.data;
    const monthNumber = currentMonth + 1;
    const lastDay = new Date(currentYear, monthNumber, 0).getDate();
    return {
      currentYear,
      currentMonth,
      monthNumber,
      startDate: this.formatDate(currentYear, monthNumber, 1),
      endDate: this.formatDate(currentYear, monthNumber, lastDay)
    };
  },

  buildAnnotationState(types, assignments) {
    const safeTypes = Array.isArray(types) ? types.filter((type) => !type.deleted_at) : [];
    const safeAssignments = Array.isArray(assignments) ? assignments : [];
    const typeMap = Object.fromEntries(safeTypes.map((type) => [type.id, type]));
    const annotationDates = {};
    const annotationMap = {};
    safeAssignments.forEach((assignment) => {
      const type = typeMap[assignment.annotation_type_id];
      if (!type) return;
      if (!annotationDates[type.id]) annotationDates[type.id] = new Set();
      annotationDates[type.id].add(assignment.date);
      if (!annotationMap[assignment.date]) annotationMap[assignment.date] = [];
      annotationMap[assignment.date].push({ label: type.label, color: type.color });
    });
    return { annotationDates, annotationMap };
  },

  applyCalendarData(records, annotationState = {}) {
    const { currentYear, currentMonth } = this.data;
    const safeRecords = Array.isArray(records) ? records : [];
    const validRecords = safeRecords
      .filter((record) => record.type !== '草稿')
      .sort((a, b) => (
        b.date.localeCompare(a.date) ||
        String(b.created_at || '').localeCompare(String(a.created_at || ''))
      ));
    const annotationMap = annotationState.annotationMap || this.data.annotationMap;
    const monthRecords = this.buildTimelineRecords(validRecords);
    this.photoSyncSnapshot = this.getPhotoSyncSnapshot(validRecords);
    this.setData({
      ...annotationState,
      calendarDays: this.buildCalendarDays(currentYear, currentMonth, safeRecords, annotationMap),
      monthRecords,
      monthlyStats: this.calculateMonthlyStats(validRecords)
    });
    this.rebuildTimeline();
  },

  renderCachedCalendar() {
    if (!this.data.currentYear) return;
    const { monthNumber, startDate, endDate } = this.getCurrentMonthRange();
    const records = dataRepository.getCachedRecordsByDateRange(startDate, endDate);
    const annotations = dataRepository.getCachedAnnotations();
    const monthKey = `${this.data.currentYear}-${String(monthNumber).padStart(2, '0')}`;
    const types = annotations && Array.isArray(annotations.types) ? annotations.types : [];
    const assignments = annotations && Array.isArray(annotations.assignments)
      ? annotations.assignments.filter((item) => String(item.date || '').startsWith(monthKey))
      : [];
    const annotationState = this.buildAnnotationState(types, assignments);
    this.setData({
      calendarLoading: false,
      calendarError: '',
      calendarTitle: `${this.data.currentYear}年${monthNumber}月`,
      annotationTypes: types.filter((type) => !type.deleted_at)
    });
    this.applyCalendarData(records, annotationState);
  },

  async loadCalendar(options = {}) {
    const { currentYear, currentMonth, monthNumber, startDate, endDate } = this.getCurrentMonthRange();
    const requestKey = `${currentYear}-${monthNumber}`;
    const preserveExisting = Boolean(options.preserveExisting && this.data.calendarDays.length);

    this.setData({
      calendarLoading: !preserveExisting,
      calendarError: '',
      calendarTitle: `${currentYear}年${monthNumber}月`
    });

    try {
      const [records, types, assignments] = await Promise.all([
        dataRepository.getRecordsByDateRange(startDate, endDate),
        dataRepository.getAnnotationTypes(),
        dataRepository.getMonthAssignments(currentYear, monthNumber)
      ]);
      if (`${this.data.currentYear}-${this.data.currentMonth + 1}` !== requestKey) return;
      const annotationState = this.buildAnnotationState(types, assignments);
      this.setData({ annotationTypes: types });
      this.applyCalendarData(records, annotationState);
    } catch (error) {
      if (`${this.data.currentYear}-${this.data.currentMonth + 1}` !== requestKey) return;
      if (!preserveExisting) {
        this.setData({
          calendarError: error.message || '月历读取失败，请稍后重试',
          calendarDays: this.buildCalendarDays(currentYear, currentMonth, []),
          monthRecords: [],
          monthlyStats: this.calculateMonthlyStats([])
        });
        this.rebuildTimeline();
      }
    } finally {
      this.setData({ calendarLoading: false });
    }
  },

  buildCalendarDays(year, month, records, annotationMap = this.data.annotationMap) {
    const firstWeekday = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayKey = this.formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const recordMap = {};

    records.forEach((record) => {
      if (record.type === '草稿') return;
      const level = this.getRecordColorLevel(record);
      const existing = recordMap[record.date];
      if (!existing || level > existing.colorLevel) {
        recordMap[record.date] = {
          practiced: true,
          colorLevel: level,
          hasBreakthrough: Boolean(record.breakthrough)
        };
      } else if (record.breakthrough) {
        existing.hasBreakthrough = true;
      }
    });

    const days = Array.from({ length: firstWeekday }, (_, index) => ({
      key: `empty-start-${index}`,
      empty: true
    }));

    for (let day = 1; day <= totalDays; day += 1) {
      const date = this.formatDate(year, month + 1, day);
      const practice = recordMap[date];
      const moonType = getMoonType(date);
      const annos = annotationMap[date] || [];
      const annotationColors = annos.length > 0 ? annos.map((a) => a.color) : [];
      days.push({
        key: date,
        day,
        date,
        practiced: Boolean(practice),
        colorClass: practice ? `green-gradient-${practice.colorLevel}` : '',
        hasBreakthrough: Boolean(practice && practice.hasBreakthrough),
        moonType,
        moonIcon: getMoonIcon(date),
        isFuture: date > todayKey,
        annotationColors,
        previewAnnotationColors: annotationColors.slice(0, 3),
        extraAnnotationCount: Math.max(0, annotationColors.length - 3)
      });
    }

    while (days.length % 7 !== 0) {
      days.push({ key: `empty-end-${days.length}`, empty: true });
    }
    return days;
  },

  getRecordColorLevel(record) {
    const recordLevel = Number(record.color_level);
    if (recordLevel >= 1 && recordLevel <= 4) return recordLevel;
    const recordType = String(record.type || '');
    const option = this.data.practiceOptions.find((item) => (
      recordType === item.label ||
      recordType.startsWith(`${item.label} `)
    ));
    return Math.min(4, Math.max(1, Number(option && option.color_level) || 3));
  },

  buildTimelineRecords(records) {
    return records.map((record) => {
      const dateParts = String(record.date).split('-');
      const durationMinutes = Math.floor(Number(record.duration || 0) / 60);
      const photos = Array.isArray(record.photos) ? record.photos : [];
      return {
        ...record,
        photoItems: photos.map((src) => ({
          src,
          status: dataRepository.getPhotoSyncStatus(record.id, src)
        })),
        timelineDate: `${Number(dateParts[1])}/${Number(dateParts[2])}`,
        durationMinutes,
        displayType: String(record.type || '').split(/\s+|-\s*/)[0],
        dotClass: getMoonType(record.date)
          ? 'moon'
          : record.breakthrough
            ? 'breakthrough'
            : ''
      };
    });
  },

  calculateMonthlyStats(records) {
    const completed = records.filter((record) => Number(record.duration || 0) > 0);
    const totalMinutes = Math.round(
      completed.reduce((sum, record) => sum + Number(record.duration || 0), 0) / 60
    );
    const uniqueDates = [...new Set(completed.map((record) => record.date))].sort().reverse();
    let consecutiveWeeks = 0;

    if (uniqueDates.length) {
      let spanDays = 1;
      for (let index = 0; index < uniqueDates.length - 1; index += 1) {
        const gap = Math.floor(
          (new Date(uniqueDates[index]).getTime() - new Date(uniqueDates[index + 1]).getTime()) /
          (1000 * 60 * 60 * 24)
        );
        if (gap > 7) break;
        spanDays += gap;
      }
      consecutiveWeeks = Math.ceil(spanDays / 7);
    }

    return {
      practiceDays: completed.length,
      totalMinutes,
      avgMinutes: completed.length ? Math.round(totalMinutes / completed.length) : 0,
      consecutiveWeeks
    };
  },

  buildMonthlyShareData() {
    const { currentYear, currentMonth, monthRecords } = this.data;
    const completed = monthRecords.filter((record) => Number(record.duration || 0) > 0 && record.type !== '草稿');
    const totalSeconds = completed.reduce((sum, record) => sum + Number(record.duration || 0), 0);
    const totalHours = Math.round(totalSeconds / 3600);
    const breathCount = Math.round(totalSeconds / 6);
    const photosynthesisCount = breathCount * 144;
    const firstDay = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const practicedDates = {};
    completed.forEach((record) => {
      const parts = String(record.date || '').split('-');
      const day = Number(parts[2]);
      if (day) practicedDates[day] = true;
    });
    const calendarDays = [];
    for (let index = 0; index < firstDay.getDay(); index += 1) {
      calendarDays.push({ key: `empty-${index}`, empty: true, practiced: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      calendarDays.push({ key: `day-${day}`, day, practiced: Boolean(practicedDates[day]) });
    }
    const profile = dataRepository.getCachedProfile();
    return {
      year: currentYear,
      month: currentMonth + 1,
      totalHours,
      breathCount,
      photosynthesisCount,
      profileName: profile.name,
      profileSignature: profile.signature,
      profileAvatar: profile.avatar || '',
      calendarDays
    };
  },

  openMonthlyShare() {
    const shareCardData = this.buildMonthlyShareData();
    this.setData({ showMonthlyShare: true, shareCardData }, () => {
      this.setTabBarHidden(true);
    });
  },

  closeMonthlyShare() {
    this.setData({ showMonthlyShare: false });
    this.setTabBarHidden(false);
  },

  buildRecordShareData(record) {
    const profile = dataRepository.getCachedProfile();
    const startDate = `${this.data.currentYear}-01-01`;
    const endDate = `${this.data.currentYear}-12-31`;
    const cachedYearRecords = dataRepository.getCachedRecordsByDateRange(startDate, endDate);
    const yearRecords = cachedYearRecords.length ? cachedYearRecords : this.data.monthRecords;
    const completed = yearRecords.filter((item) => Number(item.duration || 0) > 0 && item.type !== '草稿');
    const totalSeconds = completed.reduce((sum, item) => sum + Number(item.duration || 0), 0);
    const dateParts = String(record.date || '').split('-');
    return {
      recordId: record.id || '',
      formattedDate: dateParts.length === 3
        ? `${dateParts[0]}.${dateParts[1]}.${dateParts[2]}`
        : String(record.date || ''),
      type: record.type || '',
      durationMinutes: Math.floor(Number(record.duration || 0) / 60),
      breakthrough: record.breakthrough || '',
      notes: record.notes || '今日练习完成',
      thisMonthDays: this.data.monthlyStats.practiceDays,
      totalPracticeCount: completed.length,
      totalHours: Math.round(totalSeconds / 3600),
      profileName: profile.name,
      profileSignature: profile.signature,
      profileAvatar: profile.avatar || '',
      photos: Array.isArray(record.photos) ? record.photos.filter(Boolean) : []
    };
  },

  async refreshRecordShareStats(recordId) {
    try {
      const startDate = `${this.data.currentYear}-01-01`;
      const endDate = `${this.data.currentYear}-12-31`;
      const yearRecords = await dataRepository.getRecordsByDateRange(startDate, endDate);
      if (!this.data.showRecordShare || this.data.recordShareData.recordId !== recordId) return;
      const completed = yearRecords.filter((item) => Number(item.duration || 0) > 0 && item.type !== '草稿');
      const totalSeconds = completed.reduce((sum, item) => sum + Number(item.duration || 0), 0);
      this.setData({
        'recordShareData.totalPracticeCount': completed.length,
        'recordShareData.totalHours': Math.round(totalSeconds / 3600)
      });
    } catch (error) {
      // 卡片先用本地缓存即时打开；后台统计失败不阻塞预览和保存。
    }
  },

  openRecordShare(event) {
    const record = event.currentTarget.dataset.record;
    if (!record) return;
    const recordShareData = this.buildRecordShareData(record);
    this.setData({ showRecordShare: true, recordShareData }, () => {
      this.setTabBarHidden(true);
    });
    void this.refreshRecordShareStats(recordShareData.recordId);
  },

  closeRecordShare() {
    this.setData({ showRecordShare: false });
    this.setTabBarHidden(false);
  },

  formatDate(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },

  getTimelineMonthKey(year, monthIndex) {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  },

  rebuildTimeline() {
    const currentKey = this.getTimelineMonthKey(this.data.currentYear, this.data.currentMonth);
    const loadedKeys = this._timelineLoadedKeys.length ? this._timelineLoadedKeys : [currentKey];
    this._timelineLoadedKeys = loadedKeys;
    const floorKey = this._timelineFloorKey || '';
    const lastKey = loadedKeys[loadedKeys.length - 1];
    const hasMore = Boolean(floorKey) && lastKey > floorKey;
    this.setData({
      timelineRecords: this.data.monthRecords.concat(this._olderTimelineRecords),
      timelineHasMore: hasMore
    });
  },

  prepareTimelineFloor() {
    if (this._timelineFloorKey || this._timelineFloorPromise) return this._timelineFloorPromise;
    this._timelineFloorPromise = dataRepository.getEarliestRecordDate()
      .then((earliestDate) => {
        if (earliestDate) {
          const parts = String(earliestDate).split('-').map(Number);
          this._timelineFloorKey = this.getTimelineMonthKey(parts[0], parts[1] - 1);
        } else {
          this._timelineFloorKey = '9999-12';
        }
      })
      .catch(() => {
        this._timelineFloorKey = this._timelineFloorKey || '';
      })
      .finally(() => {
        this.rebuildTimeline();
      });
    return this._timelineFloorPromise;
  },

  async loadMoreTimeline() {
    if (this._timelineLoading || this.data.timelineLoadingMore) return;
    await this.prepareTimelineFloor();
    const floorKey = this._timelineFloorKey || '';
    const currentKey = this.getTimelineMonthKey(this.data.currentYear, this.data.currentMonth);
    const loadedKeys = this._timelineLoadedKeys.length ? this._timelineLoadedKeys : [currentKey];
    this._timelineLoadedKeys = loadedKeys;
    const lastKey = loadedKeys[loadedKeys.length - 1];
    if (!lastKey || !floorKey || lastKey <= floorKey) {
      this.setData({ timelineHasMore: false });
      return;
    }
    const parts = lastKey.split('-').map(Number);
    const prev = new Date(parts[0], parts[1] - 2, 1);
    const prevKey = this.getTimelineMonthKey(prev.getFullYear(), prev.getMonth());
    if (prevKey < floorKey) {
      this.setData({ timelineHasMore: false });
      return;
    }
    this._timelineLoading = true;
    this.setData({ timelineLoadingMore: true });
    try {
      const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
      const startDate = this.formatDate(prev.getFullYear(), prev.getMonth() + 1, 1);
      const endDate = this.formatDate(prev.getFullYear(), prev.getMonth() + 1, lastDay);
      const records = await dataRepository.getRecordsByDateRange(startDate, endDate);
      const valid = (Array.isArray(records) ? records : [])
        .filter((record) => record.type !== '草稿')
        .sort((a, b) => (
          String(b.date || '').localeCompare(String(a.date || '')) ||
          String(b.created_at || '').localeCompare(String(a.created_at || ''))
        ));
      this._olderTimelineRecords = this._olderTimelineRecords.concat(this.buildTimelineRecords(valid));
      this._timelineLoadedKeys = loadedKeys.concat([prevKey]);
      this.rebuildTimeline();
    } catch (error) {
      runtimeErrors.recordEvent('page', 'journal_load_more_error', {
        month: prevKey,
        message: error && error.message
      });
    } finally {
      this._timelineLoading = false;
      this.setData({ timelineLoadingMore: false });
    }
  },

  onReachBottom() {
    if (this.data.showRecordSheet ||
        this.data.showAnnotationManager ||
        this.data.showXiaohongshuModal ||
        this.data.showMonthlyShare ||
        this.data.showRecordShare) {
      return;
    }
    this.loadMoreTimeline();
  },

  onTimelineLoadMoreTap() {
    this.loadMoreTimeline();
  },

  changeMonth(offset) {
    this._olderTimelineRecords = [];
    this._timelineLoadedKeys = [];
    this._timelineLoading = false;
    const target = new Date(this.data.currentYear, this.data.currentMonth + offset, 1);
    this.setData({
      currentYear: target.getFullYear(),
      currentMonth: target.getMonth(),
      highlightedDate: ''
    });
    this.renderCachedCalendar();
    this.loadCalendar({ preserveExisting: true });
  },

  onPreviousMonth() {
    this.changeMonth(-1);
  },

  onNextMonth() {
    this.changeMonth(1);
  },

  onCalendarDayTap(event) {
    const day = event.currentTarget.dataset.day;
    if (!day) return;
    if (day.moonType && !day.practiced) {
      this.setData({ moonDialog: { open: true, type: day.moonType } });
      return;
    }
    const record = this.data.monthRecords.find((item) => item.date === day.date);
    if (!record) return;
    this.setData({ highlightedDate: day.date });
    wx.pageScrollTo({
      selector: `#record-${record.id}`,
      duration: 300
    });
    setTimeout(() => this.setData({ highlightedDate: '' }), 1200);
  },

  onToolbarTap(event) {
    const action = event.currentTarget.dataset.action;
    if (action === 'add') {
      this.openAddRecord();
      return;
    }
    if (action === 'sync') {
      this.openAccountSync();
      return;
    }
    if (action === 'message') {
      this.setData({
        showXiaohongshuModal: true,
        hasNewXhsMessage: false
      }, () => this.setTabBarHidden(true));
      wx.setStorageSync('xhs_invite_version', INVITE_VERSION);
      return;
    }
    if (action === 'annotation') {
      this.setData({ showAnnotationManager: true }, () => this.setTabBarHidden(true));
      return;
    }
  },

  onXiaohongshuClose() {
    this.setData({ showXiaohongshuModal: false });
    this.setTabBarHidden(false);
  },

  // ===== 标注事件处理 =====

  onAnnotationClose() {
    this.setData({ showAnnotationManager: false });
    this.setTabBarHidden(false);
    this.renderCachedCalendar();
    this.loadCalendar({ preserveExisting: true });
  },

  async onAnnotationCreateType(event) {
    const { optimisticId, label, color } = event.detail;
    try {
      const created = await dataRepository.createAnnotationType(label, color);
      if (optimisticId && created && created.id) {
        this.setData({
          annotationTypeIdMap: {
            ...this.data.annotationTypeIdMap,
            [optimisticId]: created.id
          }
        });
      }
      await this.loadAnnotationTypes();
      wx.showToast({ title: '创建成功', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '创建失败，请重试', icon: 'none' });
    }
  },

  async onAnnotationUpdateType(event) {
    const { id, updates } = event.detail;
    try {
      await dataRepository.updateAnnotationType(id, updates);
      await this.loadAnnotationTypes();
      wx.showToast({ title: '更新成功', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '更新失败，请重试', icon: 'none' });
    }
  },

  async onAnnotationDeleteType(event) {
    const { id } = event.detail;
    try {
      await dataRepository.deleteAnnotationType(id);
      await this.loadAnnotationTypes();
      wx.showToast({ title: '删除成功', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '删除失败，请重试', icon: 'none' });
    }
  },

  async onAnnotationSave(event) {
    const { adds, removes } = event.detail;
    const { annotationTypeIdMap } = this.data;
    const resolveTypeId = (typeId) => annotationTypeIdMap[typeId] || typeId;
    try {
      const promises = [];
      for (const [typeId, dates] of Object.entries(adds)) {
        const realTypeId = resolveTypeId(typeId);
        for (const date of dates) {
          promises.push(dataRepository.addAnnotation(realTypeId, date));
        }
      }
      for (const [typeId, dates] of Object.entries(removes)) {
        const realTypeId = resolveTypeId(typeId);
        for (const date of dates) {
          promises.push(dataRepository.removeAnnotation(realTypeId, date));
        }
      }
      await Promise.all(promises);
      this.setData({ showAnnotationManager: false });
      this.setTabBarHidden(false);
      this.renderCachedCalendar();
      this.loadCalendar({ preserveExisting: true });
      dataRepository.syncPhotosInBackground().then(() => {
        const nextSyncState = dataRepository.getRecordSyncState();
        this.setData({
          pendingSyncCount: nextSyncState.pending,
          syncStatus: nextSyncState.pending > 0 ? 'error' : 'success'
        });
      });
      wx.showToast({ title: '标注已保存', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  async openAddRecord() {
    if (this.data.draftPreparing || this.data.submitLoading) return;
    const today = new Date();
    const firstOption = this.data.practiceOptions[0] || { label: '一序列', color_level: 3 };
    const form = {
      date: this.formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
      type: firstOption.label,
      durationMinutes: '60',
      notes: '',
      breakthrough: '',
      breakthroughEnabled: false,
      color_level: Number(firstOption.color_level) || 3,
      photos: []
    };
    if (this.data.dataMode === 'cloud') {
      this.setData({ draftPreparing: true });
      wx.showLoading({ title: '准备记录中' });
      try {
        const draft = await dataRepository.createRecord({
          date: form.date,
          type: '草稿',
          duration: 60,
          notes: '',
          color_level: form.color_level,
          photos: []
        });
        form.id = draft.id;
        form.isDraft = true;
      } catch (error) {
        wx.showToast({ title: error.message || '准备记录失败', icon: 'none' });
        return;
      } finally {
        wx.hideLoading();
        this.setData({ draftPreparing: false });
      }
    }
    this.setData({
      showRecordSheet: true,
      recordSheetMode: 'add',
      selectedTypeIndex: 0,
      formPhotoUploading: false,
      recordForm: form
    }, () => this.setTabBarHidden(true));
  },

  onRecordTap(event) {
    const record = event.currentTarget.dataset.record;
    if (!record) return;
    let selectedTypeIndex = this.data.optionLabels.indexOf(record.type);
    let practiceOptions = this.data.practiceOptions;
    let optionLabels = this.data.optionLabels;
    if (selectedTypeIndex < 0) {
      practiceOptions = [
        ...practiceOptions,
        { label: record.type, color_level: Number(record.color_level) || 3 }
      ];
      optionLabels = [...optionLabels, record.type];
      selectedTypeIndex = optionLabels.length - 1;
    }
    this.setData({
      practiceOptions,
      optionLabels,
      selectedTypeIndex,
      showRecordSheet: true,
      recordSheetMode: 'edit',
      formPhotoUploading: false,
      recordForm: {
        id: record.id,
        date: record.date,
        type: record.type,
        durationMinutes: String(Math.floor(Number(record.duration || 0) / 60)),
        notes: record.notes || '',
        breakthrough: record.breakthrough || '',
        breakthroughEnabled: Boolean(record.breakthrough),
        color_level: Number(record.color_level) || 3,
        photos: Array.isArray(record.photos) ? record.photos : []
      }
    }, () => this.setTabBarHidden(true));
  },

  async closeRecordSheet() {
    if (this.data.submitLoading) return;
    if (this.data.formPhotoUploading) {
      wx.showToast({ title: '照片正在上传，请稍候', icon: 'none' });
      return;
    }
    const draftId = this.data.recordSheetMode === 'add'
      ? this.data.recordForm.id
      : '';
    this.setData({ submitLoading: true });
    try {
      if (draftId) {
        await dataRepository.softDeleteRecord(draftId);
        await dataRepository.syncPendingRecords({ includePhotos: true });
      }
      this.setData({ showRecordSheet: false, formPhotoUploading: false });
      this.setTabBarHidden(false);
    } catch (error) {
      wx.showToast({ title: error.message || '草稿清理失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitLoading: false });
    }
  },

  onSharedFormChange(event) {
    this.setData({ recordForm: event.detail });
  },

  onFormPhotoUploadState(event) {
    this.setData({ formPhotoUploading: Boolean(event.detail && event.detail.uploading) });
  },

  onRecordFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`recordForm.${field}`]: event.detail.value });
  },

  onRecordDateChange(event) {
    this.setData({ 'recordForm.date': event.detail.value });
  },

  onRecordTypeChange(event) {
    const index = Number(event.detail.value) || 0;
    const option = this.data.practiceOptions[index];
    if (!option) return;
    this.setData({
      selectedTypeIndex: index,
      'recordForm.type': option.label,
      'recordForm.color_level': Number(option.color_level) || 3
    });
  },

  onColorLevelTap(event) {
    this.setData({
      'recordForm.color_level': Number(event.currentTarget.dataset.level) || 3
    });
  },

  async saveRecord(event) {
    const form = event && event.detail && event.detail.date
      ? event.detail
      : this.data.recordForm;
    if (!form.date || !form.type) {
      wx.showToast({ title: '请选择日期和练习类型', icon: 'none' });
      return;
    }
    const durationMinutes = Math.max(0, Number(form.durationMinutes) || 0);
    const payload = {
      date: form.date,
      type: form.type,
      duration: durationMinutes * 60,
      notes: String(form.notes || '').trim() || '今日练习完成',
      breakthrough: String(form.breakthrough || '').trim() || null,
      color_level: Number(form.color_level) || 3,
      photos: Array.isArray(form.photos) ? form.photos : []
    };

    this.setData({ submitLoading: true });
    try {
      if (this.data.recordSheetMode === 'edit' || form.id) {
        await dataRepository.updateRecord(form.id, payload);
      } else {
        await dataRepository.createRecord(payload);
      }
      this.setData({ showRecordSheet: false, formPhotoUploading: false });
      wx.showToast({
        title: this.data.recordSheetMode === 'edit' ? '更新成功' : '补卡成功',
        icon: 'success'
      });
      this.setTabBarHidden(false);
      this.renderCachedCalendar();
      this.loadCalendar({ preserveExisting: true });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitLoading: false });
    }
  },

  deleteRecord() {
    const id = this.data.recordForm.id;
    if (!id || this.data.submitLoading) return;
    wx.showModal({
      title: '删除这条记录？',
      content: this.data.dataMode === 'cloud'
        ? '删除后，网页版与小程序都将不再显示这条记录。'
        : '删除后，这条本机游客记录将不再显示。',
      confirmText: '删除',
      confirmColor: '#A34837',
      success: async (result) => {
        if (!result.confirm) return;
        this.setData({ submitLoading: true });
        try {
          await dataRepository.softDeleteRecord(id);
          this.setData({ showRecordSheet: false });
          wx.showToast({ title: '已删除', icon: 'success' });
          this.setTabBarHidden(false);
          this.renderCachedCalendar();
          this.loadCalendar({ preserveExisting: true });
        } catch (error) {
          wx.showToast({ title: error.message || '删除失败，请重试', icon: 'none' });
        } finally {
          this.setData({ submitLoading: false });
        }
      }
    });
  },

  closeMoonDialog() {
    this.setData({ moonDialog: { open: false, type: '' } });
  },

  setTabBarHidden(hidden) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden });
    }
  },

  onMembershipLimit(event) {
    const reason = event && event.detail ? event.detail.reason : 'locked_annotation';
    this.setData({
      showMembershipPrompt: true,
      membershipPromptReason: reason
    }, () => this.setTabBarHidden(true));
  },

  closeMembershipPrompt() {
    this.setData({ showMembershipPrompt: false }, () => {
      this.setTabBarHidden(Boolean(
        this.data.showRecordSheet ||
        this.data.showAnnotationManager ||
        this.data.showXiaohongshuModal ||
        this.data.showMonthlyShare ||
        this.data.showRecordShare
      ));
    });
  },

  getCachedVisibleMonthRecords() {
    if (!this.data.currentYear) return [];
    const { startDate, endDate } = this.getCurrentMonthRange();
    return dataRepository.getCachedRecordsByDateRange(startDate, endDate)
      .filter((record) => record.type !== '草稿')
      .sort((a, b) => (
        String(b.date || '').localeCompare(String(a.date || '')) ||
        String(b.created_at || '').localeCompare(String(a.created_at || ''))
      ));
  },

  getPhotoSyncSnapshot(records) {
    return (Array.isArray(records) ? records : []).map((record) => {
      const photos = Array.isArray(record.photos) ? record.photos : [];
      const photoState = photos.map((src) => (
        `${src}:${dataRepository.getPhotoSyncStatus(record.id, src)}`
      )).join(',');
      return `${record.id || ''}[${photoState}]`;
    }).join('|');
  },

  refreshPhotoSyncItems() {
    const records = this.getCachedVisibleMonthRecords();
    const nextSnapshot = this.getPhotoSyncSnapshot(records);
    if (nextSnapshot === this.photoSyncSnapshot) return false;
    this.photoSyncSnapshot = nextSnapshot;
    this.setData({ monthRecords: this.buildTimelineRecords(records) });
    this.rebuildTimeline();
    return true;
  },

  openMembershipSettings() {
    this.setData({ showMembershipPrompt: false });
    wx.setStorageSync('ashtanga_profile_settings_tab', 'membership');
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  previewTimelinePhoto(event) {
    const photos = event.currentTarget.dataset.photos;
    const urls = Array.isArray(photos) ? photos.filter(Boolean) : [];
    if (!urls.length) return;
    wx.previewImage({
      current: event.currentTarget.dataset.current || urls[0],
      urls
    });
  },

  maskEmail(email) {
    const [name = '', domain = ''] = String(email || '').split('@');
    if (!domain) return '';
    const visible = name.slice(0, Math.min(3, name.length));
    return `${visible}${'*'.repeat(Math.max(3, name.length - visible.length))}@${domain}`;
  },

  openAccountSync() {
    this.setData({ showAccountSync: true }, () => this.setTabBarHidden(true));
  },

  closeAccountSync() {
    this.setData({ showAccountSync: false });
    this.setTabBarHidden(false);
  },

  keepLocalMode() {
    this.closeAccountSync();
  },

  openAuthFromSync(event) {
    const mode = (event.detail && event.detail.mode) || event.currentTarget.dataset.mode || 'login';
    this.setData({
      showAccountSync: false,
      showAuthModal: true,
      authInitialMode: mode
    });
  },

  closeAuthModal() {
    this.setData({ showAuthModal: false });
    this.setTabBarHidden(false);
  },

  async onAuthSuccess(event) {
    const user = event.detail && event.detail.user;
    const accountEmail = user && user.email ? user.email : '';
    this.setData({
      showAuthModal: false,
      dataMode: 'cloud',
      accountEmail,
      maskedAccountEmail: this.maskEmail(accountEmail),
      syncStatus: 'idle'
    });
    this.setTabBarHidden(false);
    await this.offerGuestMerge();
    await this.loadPage();
    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  async offerGuestMerge() {
    const summary = dataRepository.getGuestMergeSummary();
    if (!summary.eligible) return;
    const confirmed = await new Promise((resolve) => {
      wx.showModal({
        title: '合并本机练习数据？',
        content: `检测到本机有 ${summary.counts.records} 条练习记录${summary.counts.photos ? `、${summary.counts.photos} 张照片` : ''}。合并后会保留账号原有数据，并把本机数据上传到同一账号。`,
        confirmText: '合并数据',
        cancelText: '暂不合并',
        success: (result) => resolve(Boolean(result.confirm)),
        fail: () => resolve(false)
      });
    });
    if (!confirmed) {
      dataRepository.dismissGuestMerge();
      return;
    }
    wx.showLoading({ title: '合并数据中' });
    try {
      const result = await dataRepository.migrateGuestDataToAccount();
      wx.showToast({
        title: result.pending ? `已加入同步，待处理 ${result.pending} 项` : '本机数据已合并',
        icon: result.pending ? 'none' : 'success'
      });
    } catch (error) {
      wx.showToast({ title: error && error.message ? error.message : '本机数据合并失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async runAccountSync() {
    if (this.data.syncing) return;
    this.setData({ syncing: true, syncStatus: 'syncing' });
    this.startPhotoSyncRefresh();
    try {
      const result = await dataRepository.syncPendingRecords({ includePhotos: true });
      dataRepository.invalidateSharedReads();
      await this.loadPage({ skipBackgroundSync: true });
      const completed = result.pending === 0;
      this.setData({
        syncStatus: completed ? 'success' : 'error',
        pendingSyncCount: result.pending
      });
      wx.showToast({
        title: completed ? `同步完成${result.synced ? ` ${result.synced} 条` : ''}` : `还有 ${result.pending} 条待同步`,
        icon: completed ? 'success' : 'none'
      });
    } catch (error) {
      this.setData({ syncStatus: 'error' });
      wx.showToast({ title: '同步失败，请重试', icon: 'none' });
    } finally {
      this.stopPhotoSyncRefresh();
      this.renderCachedCalendar();
      this.setData({ syncing: false });
    }
  },

  startPhotoSyncRefresh() {
    this.stopPhotoSyncRefresh();
    this.photoSyncSnapshot = this.getPhotoSyncSnapshot(this.getCachedVisibleMonthRecords());
    this.photoSyncRefreshTimer = setInterval(() => {
      this.refreshPhotoSyncItems();
    }, 600);
  },

  stopPhotoSyncRefresh() {
    if (!this.photoSyncRefreshTimer) return;
    clearInterval(this.photoSyncRefreshTimer);
    this.photoSyncRefreshTimer = null;
  },

  runBackgroundAccountSync() {
    if (dataRepository.getMode() !== 'cloud') return Promise.resolve(null);
    if (this.backgroundSyncPromise) {
      this.startPhotoSyncRefresh();
      return this.backgroundSyncPromise;
    }
    const state = dataRepository.getRecordSyncState();
    if (!state.pending) {
      this.stopPhotoSyncRefresh();
      this.setData({ syncing: false, syncStatus: 'success', pendingSyncCount: 0 });
      return Promise.resolve({ synced: 0, pending: 0 });
    }

    this.setData({ syncing: true, syncStatus: 'syncing', pendingSyncCount: state.pending });
    this.startPhotoSyncRefresh();
    this.backgroundSyncPromise = dataRepository.syncPendingRecords({ includePhotos: true })
      .then((result) => {
        const next = dataRepository.getRecordSyncState();
        this.setData({
          pendingSyncCount: next.pending,
          syncStatus: next.pending > 0 || result.error ? 'error' : 'success'
        });
        return result;
      })
      .catch((error) => {
        const next = dataRepository.getRecordSyncState();
        this.setData({ syncStatus: 'error', pendingSyncCount: next.pending });
        return { synced: 0, pending: next.pending, error };
      })
      .finally(() => {
        this.stopPhotoSyncRefresh();
        this.renderCachedCalendar();
        this.backgroundSyncPromise = null;
        this.setData({ syncing: false });
      });
    return this.backgroundSyncPromise;
  },

  resetAccountSyncStatus() {
    const state = dataRepository.getRecordSyncState();
    this.setData({
      syncing: false,
      syncStatus: state.pending > 0 ? 'error' : 'success',
      pendingSyncCount: state.pending
    });
    wx.showToast({ title: state.pending > 0 ? '已保留待同步数据' : '同步状态已重置', icon: 'none' });
  },

  requestAccountLogout() {
    wx.showModal({
      title: '退出登录？',
      content: '退出后将回到游客模式，账号云端数据不会被删除。',
      confirmText: '退出登录',
      confirmColor: '#A34837',
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await auth.signOut();
        } catch (error) {
          // 远端退出失败时仍清理本机会话。
        }
        wx.removeStorageSync('weapp_account_mode_enabled');
        wx.setStorageSync('weapp_guest_mode_enabled', true);
        getApp().globalData.dataMode = 'guest';
        localData.ensureTutorialRecord();
        this.setData({ showAccountSync: false, syncing: false });
        this.setTabBarHidden(false);
        wx.switchTab({ url: '/pages/practice/practice' });
      }
    });
  },

  openPasswordFromSync() {
    this.setData({
      showAccountSync: false,
      showPasswordShell: true
    });
  },

  closePasswordShell() {
    this.setData({ showPasswordShell: false });
    this.setTabBarHidden(false);
  },

  onPasswordChanged() {
    this.setData({ showPasswordShell: false });
    this.setTabBarHidden(false);
    wx.showToast({ title: '密码修改成功', icon: 'success' });
  },

  goToAccount() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  stopPropagation() {}
});
