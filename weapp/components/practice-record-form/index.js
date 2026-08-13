const photoStorage = require('../../services/photo-storage');
const dataRepository = require('../../services/data-repository');
const membershipPolicy = require('../../services/membership-policy');
const { getMoonType, getMoonIcon } = require('../../services/moon-days');

Component({
  properties: {
    form: { type: Object, value: {} },
    options: { type: Array, value: [] },
    records: { type: Array, value: [] },
    showDelete: { type: Boolean, value: false },
    saveText: { type: String, value: '保存练习' },
    maxPhotos: { type: Number, value: 1 },
    isPro: { type: Boolean, value: false },
    photoEnabled: { type: Boolean, value: false }
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
    colorLevelOptions: membershipPolicy.buildColorLevelOptions(false),
    photoItems: [],
    uploadingPhotos: false,
    hasIncompletePhotos: false,
    showFullscreenNotes: false,
    cameraIcon: '/images/icons/form-camera.png',
    expandIcon: '/images/icons/form-expand.png'
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
        color_level: membershipPolicy.normalizeColorLevel(form.color_level, this.properties.isPro),
        photos: this.normalizePhotos(form.photos),
        id: form.id,
        isDraft: Boolean(form.isDraft)
      };
      this.setData({
        value,
        dateDisplay: this.formatDisplayDate(value.date),
        typeDisplay: this.formatTypeDisplay(value.type),
        typeOptions: this.buildTypeOptions(this.properties.options, value.type),
        photoItems: this.buildPhotoItems(value.photos),
        hasIncompletePhotos: value.photos.some((path) => !photoStorage.isCloudPhoto(path)),
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
    'isPro': function syncMembership(isPro) {
      const colorLevel = membershipPolicy.normalizeColorLevel(this.data.value.color_level, isPro);
      this.setData({
        colorLevelOptions: membershipPolicy.buildColorLevelOptions(isPro),
        'value.color_level': colorLevel
      }, () => this.emitChange());
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
      const level = Number(event.currentTarget.dataset.level) || 3;
      if (!membershipPolicy.isColorLevelAllowed(level, this.properties.isPro)) {
        this.triggerEvent('membershipLimit', { reason: 'color_level' });
        return;
      }
      this.setData({
        'value.color_level': level
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
        const moonType = getMoonType(date);
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
          moonIcon: getMoonIcon(date)
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
      if (option.membershipLocked) {
        this.triggerEvent('membershipLimit', { reason: 'locked_option' });
        return;
      }
      const type = option.notes ? `${option.label} ${option.notes}` : option.label;
      this.setData({
        'value.type': type,
        typeDisplay: this.formatTypeDisplay(type),
        typeOptions: this.buildTypeOptions(this.properties.options, type),
        'value.color_level': membershipPolicy.normalizeColorLevel(option.color_level, this.properties.isPro),
        showTypePicker: false
      }, () => this.emitChange());
    },

    async saveChosenPhotos(paths, currentPhotos) {
      const selectedPaths = Array.isArray(paths) ? paths.filter(Boolean) : [];
      const maxPhotos = Math.min(9, Math.max(1, Number(this.properties.maxPhotos) || 1));
      const remaining = Math.max(0, maxPhotos - currentPhotos.length);
      if (selectedPaths.length > remaining) {
        if (!this.properties.isPro) {
          this.triggerEvent('membershipLimit', { reason: 'photo_count' });
          return;
        }
        wx.showModal({
          title: '照片数量超出限制',
          content: maxPhotos === 1
            ? `FREE 用户每条记录最多添加 1 张照片，本次选择了 ${selectedPaths.length} 张，已取消添加。`
            : `当前还可添加 ${remaining} 张照片，本次选择了 ${selectedPaths.length} 张，已取消添加。`,
          showCancel: false,
          confirmText: '知道了',
          confirmColor: '#2A4B3C'
        });
        return;
      }
      if (!selectedPaths.length) return;
      const recordId = this.data.value.id;
      if (!recordId) {
        wx.showToast({ title: '正在准备练习记录，请稍后再试', icon: 'none' });
        return;
      }
      if (this.data.uploadingPhotos) {
        wx.showToast({ title: '照片正在上传，请稍候', icon: 'none' });
        return;
      }

      this._photoStatuses = this._photoStatuses || {};
      selectedPaths.forEach((path) => { this._photoStatuses[path] = 'reading'; });
      this.setUploadingState(true);
      this.setPhotos([...currentPhotos, ...selectedPaths]);
      const preparedPaths = new Map();
      try {
        const result = await dataRepository.uploadRecordPhotos(recordId, selectedPaths, {
          currentPhotos,
          isPro: this.properties.isPro,
          maxPhotos: this.properties.maxPhotos,
          onProgress: (detail) => {
            if (detail.sourcePath && detail.path && (detail.status === 'uploading' || detail.status === 'error')) {
              preparedPaths.set(detail.sourcePath, detail.path);
            }
            this.applyPhotoProgress(detail);
          }
        });
        this.setPhotos(result.photos);
        if (result.failed.length > 0) {
          wx.showToast({ title: `${result.failed.length} 张照片上传失败，请点击重试`, icon: 'none' });
        } else {
          wx.showToast({ title: '照片上传完成', icon: 'success' });
        }
      } catch (error) {
        const remainingPhotos = this.normalizePhotos(this.data.value.photos).filter((path) => (
          !selectedPaths.includes(path) || preparedPaths.has(path)
        ));
        this.setPhotos(remainingPhotos);
        wx.showToast({ title: error && error.message ? error.message : '照片上传失败', icon: 'none' });
      } finally {
        this.setUploadingState(false);
        this.refreshPhotoItems();
      }
    },

    choosePhoto() {
      if (!this.properties.photoEnabled) {
        wx.showModal({
          title: '照片云端存储',
          content: membershipPolicy.getReasonMessage('photo_account'),
          showCancel: false,
          confirmText: '知道了',
          confirmColor: '#2A4B3C'
        });
        return;
      }
      const currentPhotos = this.normalizePhotos(this.data.value.photos);
      const maxPhotos = Math.min(9, Math.max(1, Number(this.properties.maxPhotos) || 1));
      const remaining = Math.max(0, maxPhotos - currentPhotos.length);
      if (!remaining) {
        this.triggerEvent('membershipLimit', { reason: 'photo_count' });
        return;
      }

      if (wx.chooseMedia) {
        wx.chooseMedia({
          count: 20,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          success: (result) => {
            const paths = (result.tempFiles || [])
              .map((file) => file.tempFilePath)
              .filter(Boolean);
            this.saveChosenPhotos(paths, currentPhotos);
          }
        });
        return;
      }

      wx.chooseImage({
        count: 9,
        sourceType: ['album', 'camera'],
        success: (result) => {
          this.saveChosenPhotos(result.tempFilePaths || [], currentPhotos);
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
      if (this.data.uploadingPhotos) {
        wx.showToast({ title: '照片正在上传，请稍候', icon: 'none' });
        return;
      }
      const index = Number(event.currentTarget.dataset.index);
      const photos = this.normalizePhotos(this.data.value.photos)
        .filter((_, photoIndex) => photoIndex !== index);
      this.setPhotos(photos);
    },

    setPhotos(photos) {
      const normalized = this.normalizePhotos(photos);
      this.setData({
        'value.photos': normalized,
        photoItems: this.buildPhotoItems(normalized),
        hasIncompletePhotos: normalized.some((path) => !photoStorage.isCloudPhoto(path))
      }, () => this.emitChange());
    },

    buildPhotoItems(photos) {
      return this.normalizePhotos(photos).map((src) => ({
        src,
        status: photoStorage.isCloudPhoto(src)
          ? 'success'
          : (this._photoStatuses && this._photoStatuses[src]) || 'error',
        statusText: photoStorage.isCloudPhoto(src)
          ? ''
          : this.getPhotoStatusText((this._photoStatuses && this._photoStatuses[src]) || 'error')
      }));
    },

    getPhotoStatusText(status) {
      if (status === 'reading') return '读取中';
      if (status === 'uploading') return '上传中';
      return '上传失败\n点击重试';
    },

    applyPhotoProgress(detail = {}) {
      const sourcePath = detail.sourcePath || '';
      const path = detail.path || sourcePath;
      const remotePath = detail.remotePath || '';
      let photos = this.normalizePhotos(this.data.value.photos);
      if (sourcePath && path && sourcePath !== path) {
        photos = photos.map((item) => (item === sourcePath ? path : item));
        if (this._photoStatuses) delete this._photoStatuses[sourcePath];
      }
      if (remotePath) {
        photos = photos.map((item) => (item === path || item === sourcePath ? remotePath : item));
        if (this._photoStatuses) {
          delete this._photoStatuses[path];
          delete this._photoStatuses[sourcePath];
        }
      } else if (path) {
        this._photoStatuses = this._photoStatuses || {};
        this._photoStatuses[path] = detail.status || 'uploading';
      }
      this.setPhotos(photos);
    },

    refreshPhotoItems() {
      const photos = this.normalizePhotos(this.data.value.photos);
      this.setData({
        photoItems: this.buildPhotoItems(photos),
        hasIncompletePhotos: photos.some((path) => !photoStorage.isCloudPhoto(path))
      });
    },

    setUploadingState(uploading) {
      this.setData({ uploadingPhotos: Boolean(uploading) });
      this.triggerEvent('uploadState', { uploading: Boolean(uploading) });
    },

    retryPhoto(event) {
      const path = event.currentTarget.dataset.src;
      if (!path || photoStorage.isCloudPhoto(path) || this.data.uploadingPhotos) return;
      const currentPhotos = this.normalizePhotos(this.data.value.photos).filter((item) => item !== path);
      this.saveChosenPhotos([path], currentPhotos);
    },

    submit() {
      if (this.data.uploadingPhotos || this.data.hasIncompletePhotos) {
        wx.showToast({
          title: this.data.uploadingPhotos ? '请等待照片上传完成' : '请重试或移除上传失败的照片',
          icon: 'none'
        });
        return;
      }
      if (!this.data.value.date || !this.data.value.type) {
        wx.showToast({ title: '请选择日期和练习类型', icon: 'none' });
        return;
      }
      const syncState = dataRepository.getRecordSyncState ? dataRepository.getRecordSyncState() : null;
      const pendingPhotoCount = syncState && syncState.pending_by_entity
        ? Number(syncState.pending_by_entity.photo || 0)
        : 0;
      if (pendingPhotoCount > 0) {
        wx.showToast({ title: '照片已上传，保存后自动同步', icon: 'none' });
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
