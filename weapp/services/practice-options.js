const { authenticatedRequest } = require('./practice-records');
const { request } = require('../utils/request');
const config = require('../config');

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

async function getTodayPracticeCount() {
  const result = await request({
    url: `${config.apiBaseUrl}/api/stats/today`,
    method: 'GET'
  });
  return Number(result && result.count) || 0;
}

module.exports = {
  getPracticeOptions,
  getTodayPracticeCount
};
