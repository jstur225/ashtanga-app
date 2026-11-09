const PALETTE = [
  '#E8637A', '#B07856', '#2DB5B5', '#9B72CF', '#8B9EB7',
  '#D94F4F', '#5B8FE8', '#D4837A', '#C47AD4'
];
const MAX_TYPES = 9;
const { checkText } = require('../../services/content-filter');

function normalizeTypes(types) {
  return Array.isArray(types) ? types.filter((type) => type && type.id) : [];
}

function hasDate(collection, date) {
  if (!collection) return false;
  if (collection instanceof Set) return collection.has(date);
  if (Array.isArray(collection)) return collection.includes(date);
  return Boolean(collection[date]);
}

function mapHasDate(map, typeId, date) {
  return hasDate(map && map[typeId], date);
}

function toggleMapDate(map, typeId, date) {
  const next = { ...(map || {}) };
  const current = Array.isArray(next[typeId]) ? [...next[typeId]] : [];
  const index = current.indexOf(date);
  if (index >= 0) {
    current.splice(index, 1);
  } else {
    current.push(date);
  }
  next[typeId] = current;
  return next;
}

function removeMapDate(map, typeId, date) {
  const next = { ...(map || {}) };
  const current = Array.isArray(next[typeId]) ? next[typeId] : [];
  next[typeId] = current.filter((item) => item !== date);
  return next;
}

function hasPending(map) {
  return Object.keys(map || {}).some((key) => Array.isArray(map[key]) && map[key].length > 0);
}

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    types: {
      type: Array,
      value: []
    },
    annotationDates: {
      type: Object,
      value: {}
    },
    calendarYear: {
      type: Number,
      value: 0
    },
    calendarMonth: {
      type: Number,
      value: 0
    },
    isPro: {
      type: Boolean,
      value: false
    },
    maxTypes: {
      type: Number,
      value: 1
    }
  },

  data: {
    selectedTypeId: null,
    monthOffset: 0,
    viewYear: 0,
    viewMonth: 0,
    calendarDays: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    localTypes: [],
    displayTypes: [],
    optimisticType: null,
    showMode: 'main',
    editingType: null,
    formLabel: '',
    formColor: '',
    showDeleteConfirm: false,
    pendingAdds: {},
    pendingRemoves: {},
    hasPendingChanges: false,
    palette: PALETTE
  },

  observers: {
    'types': function(types) {
      this.syncTypes(types);
    },
    'annotationDates': function() {
      this.updateCalendarDays();
    },
    'maxTypes': function() {
      this.syncTypes(this.data.localTypes);
    },
    'show': function(show) {
      if (show) {
        const now = new Date();
        const baseYear = this.properties.calendarYear || now.getFullYear();
        const baseMonth = Number.isInteger(this.properties.calendarMonth)
          ? this.properties.calendarMonth
          : now.getMonth();
        const localTypes = normalizeTypes(this.properties.types);
        this.setData({
          selectedTypeId: null,
          monthOffset: 0,
          showMode: 'main',
          editingType: null,
          showDeleteConfirm: false,
          pendingAdds: {},
          pendingRemoves: {},
          hasPendingChanges: false,
          localTypes,
          displayTypes: this.decorateTypes(localTypes),
          viewYear: baseYear,
          viewMonth: baseMonth
        }, () => this.updateCalendarDays());
      }
    }
  },

  methods: {
    decorateTypes(types) {
      const maxTypes = Math.max(1, Number(this.properties.maxTypes) || 1);
      return normalizeTypes(types).slice(0, MAX_TYPES).map((type, index) => ({
        ...type,
        membershipLocked: index >= maxTypes
      }));
    },

    syncTypes(types) {
      const localTypes = normalizeTypes(types);
      let selectedTypeId = this.data.selectedTypeId;
      const optimisticType = this.data.optimisticType;
      if (optimisticType && selectedTypeId === optimisticType.id) {
        const realType = localTypes.find((type) => (
          type.label === optimisticType.label && type.color === optimisticType.color
        ));
        if (realType) {
          selectedTypeId = realType.id;
        }
      }
      this.setData({
        localTypes,
        displayTypes: this.decorateTypes(localTypes),
        selectedTypeId,
        optimisticType: selectedTypeId === (optimisticType && optimisticType.id) ? optimisticType : null
      }, () => this.updateCalendarDays());
    },

    updateCalendarDays() {
      const { viewYear, viewMonth } = this.data;
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const firstDay = new Date(viewYear, viewMonth, 1).getDay();
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push({ key: `empty-${i}`, empty: true });
      for (let d = 1; d <= daysInMonth; d++) {
        const annotationColors = this.getDateAnnotationColors(d);
        days.push({
          key: `day-${d}`,
          day: d,
          annotationColors,
          previewAnnotationColors: annotationColors.slice(0, 3),
          extraAnnotationCount: Math.max(0, annotationColors.length - 3)
        });
      }
      this.setData({ calendarDays: days });
    },

    handleTypeTap(e) {
      const typeId = e.currentTarget.dataset.typeId;
      const type = this.data.localTypes.find((item) => item.id === typeId);
      if (!type) return;
      const index = this.data.localTypes.findIndex((item) => item.id === typeId);
      if (index >= Math.max(1, Number(this.properties.maxTypes) || 1)) {
        this.triggerEvent('membershipLimit', { reason: 'locked_annotation' });
        return;
      }
      const { selectedTypeId } = this.data;
      this.setData({
        selectedTypeId: selectedTypeId === type.id ? null : type.id
      }, () => this.updateCalendarDays());
    },

    handleDateClick(e) {
      const day = e.currentTarget.dataset.day;
      const { selectedTypeId, viewYear, viewMonth, pendingAdds, pendingRemoves, annotationDates } = this.data;
      if (!selectedTypeId || !day) return;

      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const originalHas = mapHasDate(annotationDates, selectedTypeId, dateStr);

      if (originalHas) {
        // 原来有点 → 切换为移除
        const removes = toggleMapDate(pendingRemoves, selectedTypeId, dateStr);
        const adds = removeMapDate(pendingAdds, selectedTypeId, dateStr);
        this.setData({ pendingAdds: adds, pendingRemoves: removes }, () => {
          this.updateHasPendingChanges();
          this.updateCalendarDays();
        });
      } else {
        // 原来没有 → 切换为添加
        const adds = toggleMapDate(pendingAdds, selectedTypeId, dateStr);
        const removes = removeMapDate(pendingRemoves, selectedTypeId, dateStr);
        this.setData({ pendingAdds: adds, pendingRemoves: removes }, () => {
          this.updateHasPendingChanges();
          this.updateCalendarDays();
        });
      }
    },

    updateHasPendingChanges() {
      const { pendingAdds, pendingRemoves } = this.data;
      this.setData({ hasPendingChanges: hasPending(pendingAdds) || hasPending(pendingRemoves) });
    },

    getDateAnnotationColors(day) {
      const { viewYear, viewMonth, pendingAdds, pendingRemoves, annotationDates, localTypes, selectedTypeId } = this.data;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const result = [];
      for (const type of localTypes) {
        if (!type || !type.id) continue;
        const originalHas = mapHasDate(annotationDates, type.id, dateStr);
        const isPendingAdd = mapHasDate(pendingAdds, type.id, dateStr);
        const isPendingRemove = mapHasDate(pendingRemoves, type.id, dateStr);
        const has = (originalHas && !isPendingRemove) || isPendingAdd;
        if (has) {
          result.push({ color: type.color, isCurrentType: type.id === selectedTypeId });
        }
      }
      return result;
    },

    openCreateForm() {
      const { localTypes } = this.data;
      const maxTypes = Math.max(1, Number(this.properties.maxTypes) || 1);
      if (localTypes.length >= maxTypes) {
        this.setData({ showMode: 'full' });
        return;
      }
      this.setData({
        formLabel: '',
        formColor: PALETTE[localTypes.length % PALETTE.length],
        showMode: 'create'
      });
    },

    confirmCreate() {
      const { formLabel, formColor, localTypes } = this.data;
      if (!formLabel.trim()) {
        wx.showToast({ title: '请输入标注名称', icon: 'none' });
        return;
      }
      const labelCheck = checkText(formLabel.trim());
      if (!labelCheck.ok) {
        wx.showToast({ title: '内容包含不当词汇，请修改后重试', icon: 'none' });
        return;
      }
      // 乐观更新：立即将新类型插入本地列表
      const optimisticType = { id: 'opt-' + Date.now(), label: formLabel.trim(), color: formColor };
      const nextTypes = [...localTypes, optimisticType];
      this.setData({
        localTypes: nextTypes,
        displayTypes: this.decorateTypes(nextTypes),
        selectedTypeId: optimisticType.id,
        optimisticType,
        showMode: 'main'
      }, () => this.updateCalendarDays());
      this.triggerEvent('createType', {
        optimisticId: optimisticType.id,
        label: formLabel.trim(),
        color: formColor
      });
    },

    confirmEdit() {
      const { editingType, formLabel, formColor, localTypes } = this.data;
      if (!editingType || !formLabel.trim()) {
        wx.showToast({ title: '请输入标注名称', icon: 'none' });
        return;
      }
      const editLabelCheck = checkText(formLabel.trim());
      if (!editLabelCheck.ok) {
        wx.showToast({ title: '内容包含不当词汇，请修改后重试', icon: 'none' });
        return;
      }
      // 乐观更新：立即更新本地列表
      const updatedTypes = localTypes.map(t => t.id === editingType.id ? { ...t, label: formLabel.trim(), color: formColor } : t);
      this.setData({
        localTypes: updatedTypes,
        displayTypes: this.decorateTypes(updatedTypes),
        showMode: 'main',
        editingType: null
      }, () => this.updateCalendarDays());
      this.triggerEvent('updateType', {
        id: editingType.id,
        updates: { label: formLabel.trim(), color: formColor }
      });
    },

    openEditForm(type) {
      this.setData({
        editingType: type,
        formLabel: type.label,
        formColor: type.color,
        showMode: 'edit'
      });
    },

    handleTypeDoubleTap(e) {
      // 双击打开编辑
      const typeId = e.currentTarget.dataset.typeId;
      const type = this.data.localTypes.find((item) => item.id === typeId);
      if (!type) return;
      const index = this.data.localTypes.findIndex((item) => item.id === typeId);
      if (index >= Math.max(1, Number(this.properties.maxTypes) || 1)) {
        this.triggerEvent('membershipLimit', { reason: 'locked_annotation' });
        return;
      }
      this.openEditForm(type);
    },

    handleDelete() {
      this.setData({ showDeleteConfirm: true });
    },

    confirmDelete() {
      const { editingType, selectedTypeId, localTypes } = this.data;
      if (!editingType) return;
      // 乐观更新：立即从本地列表移除
      const nextTypes = localTypes.filter(t => t.id !== editingType.id);
      this.setData({
        localTypes: nextTypes,
        displayTypes: this.decorateTypes(nextTypes),
        showDeleteConfirm: false,
        showMode: 'main',
        editingType: null,
        selectedTypeId: selectedTypeId === editingType.id ? null : selectedTypeId
      }, () => this.updateCalendarDays());
      this.triggerEvent('deleteType', { id: editingType.id });
    },

    cancelDelete() {
      this.setData({ showDeleteConfirm: false });
    },

    handleSave() {
      const { pendingAdds, pendingRemoves } = this.data;
      this.triggerEvent('saveAnnotations', {
        adds: pendingAdds,
        removes: pendingRemoves
      });
    },

    handleClose() {
      this.triggerEvent('close');
    },

    backToMain() {
      this.setData({ showMode: 'main', editingType: null });
    },

    changeMonth(offset) {
      const { monthOffset } = this.data;
      const newOffset = monthOffset + offset;
      const now = new Date();
      const baseYear = this.properties.calendarYear || now.getFullYear();
      const baseMonth = Number.isInteger(this.properties.calendarMonth)
        ? this.properties.calendarMonth
        : now.getMonth();
      const viewDate = new Date(baseYear, baseMonth + newOffset, 1);
      this.setData({
        monthOffset: newOffset,
        viewYear: viewDate.getFullYear(),
        viewMonth: viewDate.getMonth()
      }, () => this.updateCalendarDays());
    },

    onPrevMonth() { this.changeMonth(-1); },
    onNextMonth() { this.changeMonth(1); },

    selectColor(e) {
      const color = e.currentTarget.dataset.color;
      this.setData({ formColor: color });
    },

    onFormLabelInput(e) {
      this.setData({ formLabel: e.detail.value });
    },

    stopPropagation() {}
  }
});
