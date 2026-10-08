const { authenticatedRequest } = require('./practice-records');
const { request } = require('../utils/request');
const config = require('../config');

const TODAY_COUNT_CACHE_KEY = 'weapp_today_practice_count_v1';
const TODAY_COUNT_FETCHED_AT_KEY = 'weapp_today_practice_count_fetched_at_v1';
const TODAY_COUNT_TTL_MS = 5 * 60 * 1000;
let todayCountPromise = null;

async function getPracticeOptions() {
  const fields = [
    'id',
    'label',
    'notes',
    'is_custom',
    'color_level',
    'created_at'
  ].join(',');
  const options = await authenticatedRequest(
    `/rest/v1/practice_options?select=${fields}&order=created_at.asc`,
    { method: 'GET' }
  );
  return options;
}

async function createPracticeOption(input) {
  const now = new Date().toISOString();
  const option = {
    id: input.id,
    user_id: input.user_id,
    label: String(input.label || '').trim(),
    notes: input.notes || '',
    is_custom: input.is_custom !== false,
    color_level: Math.min(4, Math.max(1, Number(input.color_level) || 3)),
    created_at: input.created_at || now
  };
  const result = await authenticatedRequest('/rest/v1/practice_options?on_conflict=id', {
    method: 'POST',
    header: { Prefer: 'resolution=merge-duplicates,return=representation' },
    data: option
  });
  return Array.isArray(result) ? result[0] : result;
}

async function updatePracticeOption(id, updates) {
  const allowed = ['label', 'notes', 'is_custom', 'color_level'];
  const payload = {};
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) payload[key] = updates[key];
  });
  const result = await authenticatedRequest(`/rest/v1/practice_options?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    header: { Prefer: 'return=representation' },
    data: payload
  });
  return Array.isArray(result) ? result[0] : result;
}

async function deletePracticeOption(id) {
  await authenticatedRequest(`/rest/v1/practice_options?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    header: { Prefer: 'return=minimal' }
  });
  return true;
}

function getFreshTodayPracticeCount() {
  const count = wx.getStorageSync(TODAY_COUNT_CACHE_KEY);
  const fetchedAt = Number(wx.getStorageSync(TODAY_COUNT_FETCHED_AT_KEY)) || 0;
  if (count === '' || count === undefined || count === null) return null;
  if (!fetchedAt || Date.now() - fetchedAt >= TODAY_COUNT_TTL_MS) return null;
  return Number(count) || 0;
}

async function getTodayPracticeCount(options = {}) {
  if (!options.force) {
    const cached = getFreshTodayPracticeCount();
    if (cached !== null) return cached;
  }
  if (todayCountPromise) return todayCountPromise;
  todayCountPromise = request({
    url: `${config.apiBaseUrl}/api/stats/today`,
    method: 'GET'
  }).then((result) => {
    const count = Number(result && result.count) || 0;
    wx.setStorageSync(TODAY_COUNT_CACHE_KEY, count);
    wx.setStorageSync(TODAY_COUNT_FETCHED_AT_KEY, Date.now());
    return count;
  }).finally(() => {
    todayCountPromise = null;
  });
  return todayCountPromise;
}

module.exports = {
  getPracticeOptions,
  createPracticeOption,
  updatePracticeOption,
  deletePracticeOption,
  getTodayPracticeCount,
  getFreshTodayPracticeCount,
  TODAY_COUNT_CACHE_KEY,
  TODAY_COUNT_FETCHED_AT_KEY,
  TODAY_COUNT_TTL_MS
};
