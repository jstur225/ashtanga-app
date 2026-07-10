const { supabaseRequest } = require('../utils/request');
const auth = require('./auth');

const RECENT_RECORD_FIELDS = [
  'id',
  'date',
  'type',
  'duration',
  'notes',
  'breakthrough',
  'color_level',
  'created_at',
  'updated_at'
].join(',');

async function authenticatedRequest(path, options = {}, hasRetried = false) {
  const session = await auth.getValidSession();
  if (!session) {
    const error = new Error('登录状态已失效，请重新登录');
    error.statusCode = 401;
    throw error;
  }

  try {
    return await supabaseRequest(path, {
      ...options,
      header: {
        ...(options.header || {}),
        Authorization: `Bearer ${session.access_token}`
      }
    });
  } catch (error) {
    if (auth.isRecoverableSessionError(error) && !hasRetried) {
      await auth.refreshSession(session.refresh_token);
      return authenticatedRequest(path, options, true);
    }
    throw error;
  }
}

async function getRecentRecords(limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const query = [
    `select=${RECENT_RECORD_FIELDS}`,
    'deleted_at=is.null',
    'order=date.desc,created_at.desc',
    `limit=${safeLimit}`
  ].join('&');

  return authenticatedRequest(`/rest/v1/practice_records?${query}`, {
    method: 'GET'
  });
}

async function getRecordsByDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error('缺少练习记录日期范围');
  }

  const query = [
    `select=${RECENT_RECORD_FIELDS}`,
    'deleted_at=is.null',
    `date=gte.${encodeURIComponent(startDate)}`,
    `date=lte.${encodeURIComponent(endDate)}`,
    'order=date.asc,created_at.asc'
  ].join('&');

  return authenticatedRequest(`/rest/v1/practice_records?${query}`, {
    method: 'GET'
  });
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function createRecord(input) {
  const session = await auth.getValidSession();
  if (!session || !session.user || !session.user.id) {
    const error = new Error('登录状态已失效，请重新登录');
    error.statusCode = 401;
    throw error;
  }

  const now = new Date().toISOString();
  const record = {
    id: createUuid(),
    user_id: session.user.id,
    date: input.date,
    type: input.type,
    duration: Number(input.duration) || 0,
    notes: input.notes || '今日练习完成',
    breakthrough: input.breakthrough || null,
    start_time: input.start_time || null,
    color_level: Math.min(4, Math.max(1, Number(input.color_level) || 3)),
    photos: Array.isArray(input.photos) ? input.photos : [],
    created_at: now,
    updated_at: now
  };

  const result = await authenticatedRequest('/rest/v1/practice_records', {
    method: 'POST',
    header: { Prefer: 'return=representation' },
    data: record
  });
  return Array.isArray(result) ? result[0] : result;
}

async function updateRecord(id, updates) {
  if (!id) throw new Error('缺少练习记录 ID');
  const allowed = [
    'date',
    'type',
    'duration',
    'notes',
    'breakthrough',
    'color_level',
    'photos'
  ];
  const payload = { updated_at: new Date().toISOString() };
  allowed.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      payload[field] = updates[field];
    }
  });
  if (Object.prototype.hasOwnProperty.call(payload, 'color_level')) {
    payload.color_level = Math.min(4, Math.max(1, Number(payload.color_level) || 3));
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'duration')) {
    payload.duration = Math.max(0, Number(payload.duration) || 0);
  }

  const result = await authenticatedRequest(
    `/rest/v1/practice_records?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      header: { Prefer: 'return=representation' },
      data: payload
    }
  );
  return Array.isArray(result) ? result[0] : result;
}

async function softDeleteRecord(id) {
  if (!id) throw new Error('缺少练习记录 ID');
  await authenticatedRequest(
    `/rest/v1/practice_records?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      header: { Prefer: 'return=minimal' },
      data: {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  );
  return true;
}

module.exports = {
  authenticatedRequest,
  getRecentRecords,
  getRecordsByDateRange,
  createRecord,
  updateRecord,
  softDeleteRecord
};
