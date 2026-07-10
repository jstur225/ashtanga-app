const auth = require('./auth');
const localData = require('./local-data');
const cloudRecords = require('./practice-records');
const cloudOptions = require('./practice-options');

function isCloudMode() {
  if (wx.getStorageSync('weapp_guest_mode_enabled')) {
    return false;
  }
  if (!wx.getStorageSync('weapp_account_mode_enabled')) {
    return false;
  }
  const session = auth.getStoredSession();
  return Boolean(session && session.user && session.user.id);
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function buildLocalRecord(input) {
  const now = new Date().toISOString();
  return {
    id: createUuid(),
    date: input.date,
    type: input.type,
    duration: Math.max(0, Number(input.duration) || 0),
    notes: input.notes || '今日练习完成',
    breakthrough: input.breakthrough || null,
    start_time: input.start_time || null,
    color_level: Math.min(4, Math.max(1, Number(input.color_level) || 3)),
    photos: Array.isArray(input.photos) ? input.photos : [],
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_state: 'local'
  };
}

async function getPracticeOptions() {
  const options = await (isCloudMode()
    ? cloudOptions.getPracticeOptions()
    : localData.getOptions());
  return options && options.length ? options : localData.DEFAULT_OPTIONS;
}

async function getRecordsByDateRange(startDate, endDate) {
  return isCloudMode()
    ? cloudRecords.getRecordsByDateRange(startDate, endDate)
    : localData.getRecordsByDateRange(startDate, endDate);
}

async function createRecord(input) {
  return isCloudMode()
    ? cloudRecords.createRecord(input)
    : localData.createRecord(buildLocalRecord(input));
}

async function updateRecord(id, updates) {
  return isCloudMode()
    ? cloudRecords.updateRecord(id, updates)
    : localData.updateRecord(id, updates);
}

async function softDeleteRecord(id) {
  return isCloudMode()
    ? cloudRecords.softDeleteRecord(id)
    : localData.softDeleteRecord(id);
}

async function addPracticeOption(input) {
  if (isCloudMode()) {
    throw new Error('登录账号的自定义类型将在云同步阶段统一接入');
  }
  return localData.addOption({
    ...input,
    id: createUuid()
  });
}

function getMode() {
  return isCloudMode() ? 'cloud' : 'guest';
}

module.exports = {
  getMode,
  getGuestRecordCount: localData.getActiveRecordCount,
  getPracticeOptions,
  addPracticeOption,
  getRecordsByDateRange,
  createRecord,
  updateRecord,
  softDeleteRecord
};
