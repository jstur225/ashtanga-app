const dataRepository = require('../../services/data-repository');

const MOON_DAYS_2026 = {
  '2026-01-03': 'full', '2026-01-19': 'new',
  '2026-02-02': 'full', '2026-02-17': 'new',
  '2026-03-03': 'full', '2026-03-19': 'new',
  '2026-04-02': 'full', '2026-04-17': 'new',
  '2026-05-02': 'full', '2026-05-17': 'new', '2026-05-31': 'full',
  '2026-06-15': 'new', '2026-06-30': 'full',
  '2026-07-14': 'new', '2026-07-29': 'full',
  '2026-08-13': 'new', '2026-08-28': 'full',
  '2026-09-11': 'new', '2026-09-27': 'full',
  '2026-10-10': 'new', '2026-10-26': 'full',
  '2026-11-09': 'new', '2026-11-24': 'full',
  '2026-12-09': 'new', '2026-12-24': 'full'
};

const ICONS = {
  cloud: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE3LjUgMTlIOWE3IDcgMCAxIDEgNi43LTloMS44YTQuNSA0LjUgMCAxIDEgMCA5WiIvPjwvc3ZnPg==',
  message: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIxIDE1YTQgNCAwIDAgMS00IDRIOGwtNSAzVjdhNCA0IDAgMCAxIDQtNGgxMGE0IDQgMCAwIDEgNCA0WiIvPjwvc3ZnPg==',
  pencil: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIwaDkiLz48cGF0aCBkPSJNMTYuNSAzLjVhMi4xIDIuMSAwIDAgMSAzIDNMOCAxOGwtNCAxIDEtNFoiLz48L3N2Zz4=',
  plus: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PHBhdGggZD0iTTEyIDV2MTRNNSAxMmgxNCIvPjwvc3ZnPg=='
};

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
    monthRecords: [],
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
    dataMode: 'guest'
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
      todayDate: this.formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadPage();
  },

  async loadPage() {
    this.setData({ dataMode: dataRepository.getMode() });
    await this.loadPracticeOptions();
    await this.loadCalendar();
  },

  async loadPracticeOptions() {
    try {
      const options = await dataRepository.getPracticeOptions();
      const validOptions = options.filter((option) => option.label && option.label !== '草稿');
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

  async loadCalendar() {
    const { currentYear, currentMonth } = this.data;
    const monthNumber = currentMonth + 1;
    const lastDay = new Date(currentYear, monthNumber, 0).getDate();
    const startDate = this.formatDate(currentYear, monthNumber, 1);
    const endDate = this.formatDate(currentYear, monthNumber, lastDay);

    this.setData({
      calendarLoading: true,
      calendarError: '',
      calendarTitle: `${currentYear}年${monthNumber}月`
    });

    try {
      const records = await dataRepository.getRecordsByDateRange(startDate, endDate);
      const validRecords = records
        .filter((record) => record.type !== '草稿')
        .sort((a, b) => (
          b.date.localeCompare(a.date) ||
          String(b.created_at || '').localeCompare(String(a.created_at || ''))
        ));

      this.setData({
        calendarDays: this.buildCalendarDays(currentYear, currentMonth, records),
        monthRecords: this.buildTimelineRecords(validRecords),
        monthlyStats: this.calculateMonthlyStats(validRecords)
      });
    } catch (error) {
      this.setData({
        calendarError: error.message || '月历读取失败，请稍后重试',
        calendarDays: this.buildCalendarDays(currentYear, currentMonth, []),
        monthRecords: [],
        monthlyStats: this.calculateMonthlyStats([])
      });
    } finally {
      this.setData({ calendarLoading: false });
    }
  },

  buildCalendarDays(year, month, records) {
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
      const moonType = MOON_DAYS_2026[date] || '';
      days.push({
        key: date,
        day,
        date,
        practiced: Boolean(practice),
        colorClass: practice ? `green-gradient-${practice.colorLevel}` : '',
        hasBreakthrough: Boolean(practice && practice.hasBreakthrough),
        moonType,
        moonIcon: moonType
          ? `https://ash.ashtangalife.online/moon-phase/${moonType === 'new' ? 'new-moon' : 'full-moon'}.png`
          : '',
        isFuture: date > todayKey
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
      return {
        ...record,
        timelineDate: `${Number(dateParts[1])}/${Number(dateParts[2])}`,
        durationMinutes,
        displayType: String(record.type || '').split(/\s+|-\s*/)[0],
        dotClass: MOON_DAYS_2026[record.date]
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

  formatDate(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },

  changeMonth(offset) {
    const target = new Date(this.data.currentYear, this.data.currentMonth + offset, 1);
    this.setData({
      currentYear: target.getFullYear(),
      currentMonth: target.getMonth(),
      highlightedDate: ''
    });
    this.loadCalendar();
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
      if (this.data.dataMode === 'guest') {
        wx.showToast({ title: '游客记录已保存在本机', icon: 'none' });
        return;
      }
      this.loadPage().then(() => {
        wx.showToast({ title: '同步完成', icon: 'success' });
      });
      return;
    }
    const messages = {
      message: '社群入口稍后接入',
      annotation: '日历标注稍后接入'
    };
    wx.showToast({ title: messages[action] || '稍后接入', icon: 'none' });
  },

  openAddRecord() {
    const today = new Date();
    const firstOption = this.data.practiceOptions[0] || { label: '一序列', color_level: 3 };
    this.setData({
      showRecordSheet: true,
      recordSheetMode: 'add',
      selectedTypeIndex: 0,
      recordForm: {
        date: this.formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
        type: firstOption.label,
        durationMinutes: '60',
        notes: '',
        breakthrough: '',
        breakthroughEnabled: false,
        color_level: Number(firstOption.color_level) || 3,
        photos: []
      }
    });
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
    });
  },

  closeRecordSheet() {
    if (this.data.submitLoading) return;
    this.setData({ showRecordSheet: false });
  },

  onSharedFormChange(event) {
    this.setData({ recordForm: event.detail });
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
      if (this.data.recordSheetMode === 'edit') {
        await dataRepository.updateRecord(form.id, payload);
      } else {
        await dataRepository.createRecord(payload);
      }
      this.setData({ showRecordSheet: false });
      wx.showToast({
        title: this.data.recordSheetMode === 'edit' ? '更新成功' : '补卡成功',
        icon: 'success'
      });
      await this.loadCalendar();
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
          await this.loadCalendar();
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

  goToAccount() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  stopPropagation() {}
});
