const annotations = require('./annotations');

const RECORDS_KEY = 'weapp_guest_practice_records_v1';
const OPTIONS_KEY = 'weapp_guest_practice_options_v1';

const DEFAULT_OPTIONS = [
  {
    id: 'guest-primary',
    label: '一序列',
    notes: 'Mysore',
    is_custom: false,
    color_level: 3,
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'guest-half',
    label: '半序列',
    notes: '站立+休息',
    is_custom: false,
    color_level: 2,
    created_at: '2026-01-01T00:00:00.000Z'
  }
];

function createTutorialRecord() {
  const now = new Date();
  const nowIso = now.toISOString();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return {
    id: `tutorial-${Date.now()}-1`,
    created_at: nowIso,
    updated_at: nowIso,
    date: firstDayOfMonth,
    type: '一序列 Mysore',
    duration: 5400,
    notes: '🔴特别提醒\n👈点击左侧日期区域，可编辑或删除记录\n\n🌟Mysore，让我们找回到自我的锚点',
    photos: [],
    is_tutorial: true,
    deleted_at: null,
    sync_state: 'local'
  };
}

function readArray(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

function getAllRecords() {
  return readArray(RECORDS_KEY);
}

function ensureTutorialRecord() {
  const records = getAllRecords();
  if (records.length) return records.find((record) => record.is_tutorial) || null;
  const tutorial = createTutorialRecord();
  saveRecords([tutorial]);
  return tutorial;
}

function saveRecords(records) {
  wx.setStorageSync(RECORDS_KEY, records);
}

function replaceRecords(records) {
  const nextRecords = Array.isArray(records) ? records : [];
  saveRecords(nextRecords);
  return nextRecords;
}

function getOptions() {
  const options = readArray(OPTIONS_KEY);
  if (options.length) return options;
  wx.setStorageSync(OPTIONS_KEY, DEFAULT_OPTIONS);
  return DEFAULT_OPTIONS;
}

function addOption(input, maxOptions = 3) {
  const options = getOptions();
  if (options.length >= maxOptions) {
    throw new Error(`当前最多保留 ${maxOptions} 个练习类型`);
  }
  const now = new Date().toISOString();
  const option = {
    id: input.id,
    label: input.label,
    notes: input.notes || '',
    is_custom: true,
    color_level: Math.min(4, Math.max(1, Number(input.color_level) || 3)),
    created_at: now,
    updated_at: now
  };
  wx.setStorageSync(OPTIONS_KEY, [...options, option]);
  return option;
}

function updateOption(id, updates) {
  let updated = null;
  const options = getOptions().map((option) => {
    if (option.id !== id) return option;
    updated = {
      ...option,
      label: updates.label !== undefined ? updates.label : option.label,
      notes: updates.notes !== undefined ? updates.notes : option.notes,
      color_level: updates.color_level !== undefined
        ? Math.min(4, Math.max(1, Number(updates.color_level) || 3))
        : option.color_level,
      updated_at: new Date().toISOString()
    };
    return updated;
  });
  if (!updated) throw new Error('没有找到这个练习类型');
  wx.setStorageSync(OPTIONS_KEY, options);
  return updated;
}

function deleteOption(id) {
  const options = getOptions().filter((option) => option.id !== id);
  wx.setStorageSync(OPTIONS_KEY, options);
}

function replaceOptions(options) {
  const nextOptions = Array.isArray(options) && options.length ? options : DEFAULT_OPTIONS;
  wx.setStorageSync(OPTIONS_KEY, nextOptions);
  return nextOptions;
}

function getRecordsByDateRange(startDate, endDate) {
  return getAllRecords()
    .filter((record) => (
      !record.deleted_at &&
      record.date >= startDate &&
      record.date <= endDate
    ))
    .sort((a, b) => (
      a.date.localeCompare(b.date) ||
      String(a.created_at || '').localeCompare(String(b.created_at || ''))
    ));
}

function createRecord(record) {
  saveRecords([...getAllRecords(), record]);
  return record;
}

function updateRecord(id, updates) {
  let updatedRecord = null;
  const records = getAllRecords().map((record) => {
    if (record.id !== id || record.deleted_at) return record;
    updatedRecord = {
      ...record,
      ...updates,
      updated_at: new Date().toISOString(),
      sync_state: 'local'
    };
    return updatedRecord;
  });
  if (!updatedRecord) throw new Error('没有找到这条本机记录');
  saveRecords(records);
  return updatedRecord;
}

function softDeleteRecord(id) {
  const now = new Date().toISOString();
  let found = false;
  const records = getAllRecords().map((record) => {
    if (record.id !== id || record.deleted_at) return record;
    found = true;
    return {
      ...record,
      deleted_at: now,
      updated_at: now,
      sync_state: 'local'
    };
  });
  if (!found) throw new Error('没有找到这条本机记录');
  saveRecords(records);
  return true;
}

function getActiveRecordCount() {
  return getAllRecords().filter((record) => !record.deleted_at).length;
}

function clearLocalData() {
  saveRecords([]);
  wx.setStorageSync(OPTIONS_KEY, DEFAULT_OPTIONS);
  annotations.clearAnnotations();
}

module.exports = {
  RECORDS_KEY,
  OPTIONS_KEY,
  DEFAULT_OPTIONS,
  createTutorialRecord,
  ensureTutorialRecord,
  getAllRecords,
  replaceRecords,
  getOptions,
  replaceOptions,
  addOption,
  updateOption,
  deleteOption,
  getRecordsByDateRange,
  createRecord,
  updateRecord,
  softDeleteRecord,
  getActiveRecordCount,
  clearLocalData,
  ...annotations
};
