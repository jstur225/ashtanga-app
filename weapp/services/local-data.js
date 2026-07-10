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

function readArray(key) {
  const value = wx.getStorageSync(key);
  return Array.isArray(value) ? value : [];
}

function getAllRecords() {
  return readArray(RECORDS_KEY);
}

function saveRecords(records) {
  wx.setStorageSync(RECORDS_KEY, records);
}

function getOptions() {
  const options = readArray(OPTIONS_KEY);
  if (options.length) return options;
  wx.setStorageSync(OPTIONS_KEY, DEFAULT_OPTIONS);
  return DEFAULT_OPTIONS;
}

function addOption(input) {
  const options = getOptions();
  if (options.length >= 3) {
    throw new Error('免费版最多保留 3 个自定义练习类型');
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

module.exports = {
  RECORDS_KEY,
  OPTIONS_KEY,
  DEFAULT_OPTIONS,
  getAllRecords,
  getOptions,
  addOption,
  getRecordsByDateRange,
  createRecord,
  updateRecord,
  softDeleteRecord,
  getActiveRecordCount
};
