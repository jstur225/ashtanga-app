const auth = require('./auth');
const { appApiRequest } = require('../utils/request');

async function authenticatedApi(path, options = {}, retried = false) {
  const session = await auth.getValidSession();
  if (!session) throw new Error('请先登录');
  try {
    return await appApiRequest(path, {
      ...options,
      header: { ...(options.header || {}), Authorization: `Bearer ${session.access_token}` }
    });
  } catch (error) {
    if (!retried && auth.isRecoverableSessionError(error)) {
      await auth.refreshSession(session.refresh_token);
      return authenticatedApi(path, options, true);
    }
    throw error;
  }
}

async function getTypes() {
  const result = await authenticatedApi('/api/annotations/types', { method: 'GET' });
  return result && Array.isArray(result.data) ? result.data : [];
}

async function createType(label, color) {
  const result = await authenticatedApi('/api/annotations/types', { method: 'POST', data: { label, color } });
  return result && result.data;
}

async function updateType(id, updates) {
  const result = await authenticatedApi(`/api/annotations/types/${encodeURIComponent(id)}`, { method: 'PUT', data: updates });
  return result && result.data;
}

async function deleteType(id) {
  await authenticatedApi(`/api/annotations/types/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return true;
}

async function getMonthAssignments(year, month) {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const result = await authenticatedApi(`/api/annotations/assignments?month=${key}`, { method: 'GET' });
  return result && Array.isArray(result.data) ? result.data : [];
}

async function addAssignment(typeId, date) {
  const result = await authenticatedApi('/api/annotations/assignments', { method: 'POST', data: { type_id: typeId, date } });
  return result && result.data;
}

async function removeAssignment(typeId, date) {
  await authenticatedApi(`/api/annotations/assignments?type_id=${encodeURIComponent(typeId)}&date=${encodeURIComponent(date)}`, { method: 'DELETE' });
  return true;
}

module.exports = { getTypes, createType, updateType, deleteType, getMonthAssignments, addAssignment, removeAssignment };
