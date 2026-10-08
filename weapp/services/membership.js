const auth = require('./auth');
const { appApiRequest } = require('../utils/request');
const policy = require('./membership-policy');
const CACHE_KEY = 'weapp_membership_status_v1';
const CACHE_TTL_MS = 30 * 1000;
let statusRequestPromise = null;
let statusRequestUserId = '';

const EMPTY_STATUS = {
  is_active: false,
  expires_at: null,
  expires_at_formatted: null,
  days_remaining: 0,
  type: null
};

function normalizeStatus(response) {
  const data = response && response.data ? response.data : response;
  if (!data || typeof data !== 'object') return { ...EMPTY_STATUS };
  return {
    is_active: Boolean(data.is_active),
    expires_at: data.expires_at || null,
    expires_at_formatted: data.expires_at_formatted || null,
    days_remaining: Math.max(0, Number(data.days_remaining) || 0),
    type: data.type || null
  };
}

function requestStatus(session) {
  return appApiRequest('/api/membership/status', {
    method: 'GET',
    header: {
      Authorization: `Bearer ${session.access_token}`
    }
  });
}

function cacheStatus(session, status) {
  const userId = session && session.user && session.user.id;
  if (!userId) return;
  wx.setStorageSync(CACHE_KEY, {
    user_id: userId,
    status,
    fetched_at: new Date().toISOString()
  });
}

function getCachedStatus(session) {
  const userId = session && session.user && session.user.id;
  const cached = wx.getStorageSync(CACHE_KEY);
  if (!userId || !cached || cached.user_id !== userId || !cached.status) return null;
  return normalizeStatus(cached.status);
}

function getFreshCachedStatus(session) {
  const userId = session && session.user && session.user.id;
  const cached = wx.getStorageSync(CACHE_KEY);
  const fetchedAt = Date.parse(cached && cached.fetched_at ? cached.fetched_at : '');
  if (!userId || !cached || cached.user_id !== userId || !cached.status || !fetchedAt) return null;
  if (Date.now() - fetchedAt >= CACHE_TTL_MS) return null;
  return normalizeStatus(cached.status);
}

async function requestAndCacheStatus(session) {
  const status = normalizeStatus(await requestStatus(session));
  cacheStatus(session, status);
  return status;
}

async function getMembershipStatus(options = {}) {
  const storedSession = auth.getStoredSession();
  if (!options.force) {
    const freshCached = getFreshCachedStatus(storedSession);
    if (freshCached) return freshCached;
  }
  let session = await auth.getValidSession();
  if (!session) return { ...EMPTY_STATUS };
  const userId = session && session.user ? session.user.id || '' : '';
  if (statusRequestPromise && statusRequestUserId === userId) return statusRequestPromise;
  statusRequestUserId = userId;
  statusRequestPromise = (async () => {
    try {
      return await requestAndCacheStatus(session);
    } catch (error) {
      let finalError = error;
      if (auth.isRecoverableSessionError(error)) {
        const stored = auth.getStoredSession();
        if (stored && stored.refresh_token) {
          try {
            session = await auth.refreshSession(stored.refresh_token);
            return await requestAndCacheStatus(session);
          } catch (refreshError) {
            finalError = refreshError;
          }
        }
      }
      const cached = getCachedStatus(session);
      if (cached) return cached;
      throw finalError;
    }
  })().finally(() => {
    statusRequestPromise = null;
    statusRequestUserId = '';
  });
  return statusRequestPromise;
}

module.exports = {
  CACHE_KEY,
  CACHE_TTL_MS,
  EMPTY_STATUS,
  normalizeStatus,
  getCachedStatus,
  getFreshCachedStatus,
  getMembershipStatus,
  getCapabilities: policy.getCapabilities,
  isActiveMembership: policy.isActiveMembership
};
