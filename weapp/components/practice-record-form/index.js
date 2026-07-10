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

Component({
  properties: {
    form: { type: Object, value: {} },
    options: { type: Array, value: [] },
    records: { type: Array, value: [] },
    showDelete: { type: Boolean, value: false },
    saveText: { type: String, value: '保存练习' }
  },

  data: {
    value: {
      date: '',
      type: '',
      durationMinutes: '60',
      notes: '',
      breakthrough: '',
      color_level: 3,
      photos: []
    },
    dateDisplay: '选择日期',
    typeDisplay: '选择类型',
    typeOptions: [],
    breakthroughEnabled: false,
    showDatePicker: false,
    showTypePicker: false,
    viewYear: 0,
    viewMonth: 0,
    calendarTitle: '',
    calendarDays: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    colorLevels: [1, 2, 3, 4],
    showFullscreenNotes: false,
    cameraIcon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
    expandIcon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 15 6 6"/><path d="M21 16v5h-5"/><path d="m15 9 6-6"/><path d="M21 8V3h-5"/><path d="M9 15l-6 6"/><path d="M3 16v5h5"/><path d="m9 9-6-6"/><path d="M3 8V3h5"/></svg>'
  },

  observers: {
    'form.**': function syncForm(form) {
      if (!form) return;
      const value = {
        date: form.date || '',
        type: form.type || '',
        durationMinutes: String(form.durationMinutes ?? 60),
        notes: form.notes || '',
        breakthrough: form.breakthrough || '',
        breakthroughEnabled: Boolean(form.breakthroughEnabled),
        color_level: Number(form.color_level) || 3,
        photos: this.normalizePhotos(form.photos),
        id: form.id
      };
      this.setData({
        value,
        dateDisplay: this.formatDisplayDate(value.date),
        typeDisplay: this.formatTypeDisplay(value.type),
        typeOptions: this.buildTypeOptions(this.properties.options, value.type),
        breakthroughEnabled: typeof form.breakthroughEnabled === 'boolean'
          ? form.breakthroughEnabled
          : Boolean(form.breakthrough)
      });
    },
    'options.**': function syncOptions(options) {
      this.setData({
        typeOptions: this.buildTypeOptions(options, this.data.value.type)
      });
    },
    'records.**': function syncRecords() {
      if (this.data.showDatePicker) this.buildCalendar();
    }
  },

  methods: {
    formatDisplayDate(date) {
      const parts = String(date || '').split('-');
      return parts.length === 3 ? `${Number(parts[1])}月${Number(parts[2])}日` : '选择日期';
    },

    formatTypeDisplay(type) {
      return String(type || '').split(' ')[0] || '选择类型';
    },

    buildTypeOptions(options, selectedType) {
      return (options || [])
        .filter((item) => (
          item.id !== 'custom'
          && item.id !== 'chant_switch'
          && item.id !== 'today_count'
          && !item.isCustomButton
          && !item.isCount
        ))
        .map((item) => ({
          ...item,
          selected: String(selectedType || '').indexOf(item.label) === 0
        }));
    },

    onFieldInput(event) {
      const field = event.currentTarget.dataset.field;
      this.setData({ [`value.${field}`]: event.detail.value }, () => this.emitChange());
    },

    toggleBreakthrough() {
      const breakthroughEnabled = !this.data.breakthroughEnabled;
      this.setData({
        breakthroughEnabled,
        'value.breakthrough': breakthroughEnabled ? this.data.value.breakthrough : ''
      }, () => this.emitChange());
    },

    selectColor(event) {
      this.setData({
        'value.color_level': Number(event.currentTarget.dataset.level) || 3
      }, () => this.emitChange());
    },

    openDatePicker() {
      const selected = this.data.value.date ? new Date(`${this.data.value.date}T00:00:00`) : new Date();
      this.setData({
        showDatePicker: true,
        viewYear: selected.getFullYear(),
        viewMonth: selected.getMonth()
      }, () => this.buildCalendar());
    },

    closeDatePicker() {
      this.setData({ showDatePicker: false });
    },

    changeCalendarMonth(event) {
      const offset = Number(event.currentTarget.dataset.offset) || 0;
      const target = new Date(this.data.viewYear, this.data.viewMonth + offset, 1);
      this.setData({
        viewYear: target.getFullYear(),
        viewMonth: target.getMonth()
      }, () => this.buildCalendar());
    },

    buildCalendar() {
      const { viewYear, viewMonth } = this.data;
      const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
      const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
      const today = new Date();
      const todayKey = this.formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
      const recordMap = {};

      this.properties.records.forEach((record) => {
        if (record.deleted_at || record.type === '草稿') return;
        const level = this.resolveRecordColor(record);
        const existing = recordMap[record.date];
        if (!existing || level > existing.level) {
          recordMap[record.date] = { level, breakthrough: Boolean(record.breakthrough) };
        }
      });

      const days = Array.from({ length: firstWeekday }, (_, index) => ({
        key: `empty-${index}`,
        empty: true
      }));
      for (let day = 1; day <= totalDays; day += 1) {
        const date = this.formatDate(viewYear, viewMonth + 1, day);
        const record = recordMap[date];
        const moonType = MOON_DAYS_2026[date] || '';
        days.push({
          key: date,
          day,
          date,
          disabled: date > todayKey,
          selected: date === this.data.value.date,
          practiced: Boolean(record),
          colorClass: record ? `green-gradient-${record.level}` : '',
          breakthrough: Boolean(record && record.breakthrough),
          moonType,
          moonIcon: moonType
            ? `https://ash.ashtangalife.online/moon-phase/${moonType === 'new' ? 'new-moon' : 'full-moon'}.png`
            : ''
        });
      }
      this.setData({
        calendarTitle: `${viewYear}年${viewMonth + 1}月`,
        calendarDays: days
      });
    },

    resolveRecordColor(record) {
      const ownLevel = Number(record.color_level);
      if (ownLevel >= 1 && ownLevel <= 4) return ownLevel;
      const type = String(record.type || '');
      const option = this.properties.options.find((item) => (
        type === item.label || type.startsWith(`${item.label} `)
      ));
      return Math.min(4, Math.max(1, Number(option && option.color_level) || 3));
    },

    selectDate(event) {
      const day = event.currentTarget.dataset.day;
      if (!day || day.disabled) return;
      this.setData({
        'value.date': day.date,
        dateDisplay: this.formatDisplayDate(day.date),
        showDatePicker: false
      }, () => this.emitChange());
    },

    openTypePicker() {
      this.setData({ showTypePicker: true });
    },

    closeTypePicker() {
      this.setData({ showTypePicker: false });
    },

    selectType(event) {
      const option = event.currentTarget.dataset.option;
      if (!option) return;
      const type = option.notes ? `${option.label} ${option.notes}` : option.label;
      this.setData({
        'value.type': type,
        typeDisplay: this.formatTypeDisplay(type),
        typeOptions: this.buildTypeOptions(this.properties.options, type),
        'value.color_level': Number(option.color_level) || 3,
        showTypePicker: false
      }, () => this.emitChange());
    },

    choosePhoto() {
      const currentPhotos = this.normalizePhotos(this.data.value.photos);
      const remaining = Math.max(0, 9 - currentPhotos.length);
      if (!remaining) {
        wx.showToast({ title: '最多添加 9 张照片', icon: 'none' });
        return;
      }

      if (wx.chooseMedia) {
        wx.chooseMedia({
          count: remaining,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          success: (result) => {
            const paths = (result.tempFiles || [])
              .map((file) => file.tempFilePath)
              .filter(Boolean);
            this.setPhotos([...currentPhotos, ...paths].slice(0, 9));
          }
        });
        return;
      }

      wx.chooseImage({
        count: remaining,
        sourceType: ['album', 'camera'],
        success: (result) => {
          this.setPhotos([
            ...currentPhotos,
            ...(result.tempFilePaths || [])
          ].slice(0, 9));
        }
      });
    },

    openFullscreenNotes() {
      this.setData({ showFullscreenNotes: true });
    },

    closeFullscreenNotes() {
      this.setData({ showFullscreenNotes: false });
    },

    onFullscreenNotesInput(event) {
      this.setData({ 'value.notes': event.detail.value }, () => this.emitChange());
    },

    removePhoto(event) {
      const index = Number(event.currentTarget.dataset.index);
      const photos = this.normalizePhotos(this.data.value.photos)
        .filter((_, photoIndex) => photoIndex !== index);
      this.setPhotos(photos);
    },

    setPhotos(photos) {
      this.setData({
        'value.photos': this.normalizePhotos(photos)
      }, () => this.emitChange());
    },

    submit() {
      if (!this.data.value.date || !this.data.value.type) {
        wx.showToast({ title: '请选择日期和练习类型', icon: 'none' });
        return;
      }
      this.triggerEvent('save', {
        ...this.data.value,
        durationMinutes: Math.max(0, Number(this.data.value.durationMinutes) || 0),
        photos: this.normalizePhotos(this.data.value.photos),
        breakthroughEnabled: this.data.breakthroughEnabled,
        breakthrough: this.data.breakthroughEnabled
          ? String(this.data.value.breakthrough || '').trim()
          : ''
      });
    },

    requestDelete() {
      this.triggerEvent('delete');
    },

    emitChange() {
      this.triggerEvent('change', {
        ...this.data.value,
        photos: this.normalizePhotos(this.data.value.photos),
        breakthroughEnabled: this.data.breakthroughEnabled
      });
    },

    normalizePhotos(photos) {
      return Array.isArray(photos)
        ? photos.filter((item) => typeof item === 'string' && item)
        : [];
    },

    formatDate(year, month, day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    },

    stopPropagation() {}
  }
});
