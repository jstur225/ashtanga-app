const { supabaseRequest, appApiRequest } = require('../utils/request');

const SESSION_KEY = 'supabase_session';
const REFRESH_EARLY_SECONDS = 60;
let refreshPromise = null;

function normalizeSession(data) {
  if (!data || !data.access_token || !data.refresh_token) {
    throw new Error('登录响应缺少有效会话');
  }

  const expiresAt = data.expires_at ||
    Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600);

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
    token_type: data.token_type || 'bearer',
    user: data.user || null
  };
}

function saveSession(data) {
  const session = normalizeSession(data);
  wx.setStorageSync(SESSION_KEY, session);
  return session;
}

function getStoredSession() {
  const session = wx.getStorageSync(SESSION_KEY);
  if (!session || !session.access_token || !session.refresh_token) {
    return null;
  }
  return session;
}

function clearSession() {
  wx.removeStorageSync(SESSION_KEY);
  wx.removeStorageSync('auth_token');
  wx.removeStorageSync('user_info');
}

function isRecoverableSessionError(error) {
  const message = error && error.message ? error.message : '';
  return error && (
    error.statusCode === 401 ||
    error.statusCode === 403 ||
    /session_id claim|session.*does not exist|invalid.*jwt|jwt.*invalid/i.test(message)
  );
}

async function signInWithPassword(email, password) {
  const data = await supabaseRequest('/auth/v1/token?grant_type=password', {
    method: 'POST',
    data: { email, password }
  });
  return saveSession(data);
}

async function sendRegisterCode(email) {
  return appApiRequest('/api/auth/send-verification-code', {
    method: 'POST',
    data: {
      email,
      type: 'email_verification'
    }
  });
}

async function registerWithEmail(email, password, verificationCode) {
  await appApiRequest('/api/auth/register', {
    method: 'POST',
    data: {
      email,
      password,
      verificationCode
    }
  });

  return signInWithPassword(email, password);
}

async function refreshSession(refreshToken) {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    data: { refresh_token: refreshToken }
  })
    .then(saveSession)
    .catch((error) => {
      clearSession();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function getValidSession() {
  const session = getStoredSession();
  if (!session) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Number(session.expires_at || 0) - now <= REFRESH_EARLY_SECONDS) {
    return refreshSession(session.refresh_token);
  }

  return session;
}

async function getCurrentUser() {
  const session = await getValidSession();
  if (!session) {
    return null;
  }

  try {
    const user = await supabaseRequest('/auth/v1/user', {
      method: 'GET',
      header: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (!session.user || session.user.id !== user.id) {
      wx.setStorageSync(SESSION_KEY, { ...session, user });
    }
    return user;
  } catch (error) {
    if (isRecoverableSessionError(error)) {
      const refreshed = await refreshSession(session.refresh_token);
      const user = await supabaseRequest('/auth/v1/user', {
        method: 'GET',
        header: {
          Authorization: `Bearer ${refreshed.access_token}`
        }
      });
      wx.setStorageSync(SESSION_KEY, { ...refreshed, user });
      return user;
    }
    throw error;
  }
}

async function signOut() {
  const session = getStoredSession();

  try {
    if (session && session.access_token) {
      await supabaseRequest('/auth/v1/logout', {
        method: 'POST',
        header: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
    }
  } finally {
    clearSession();
  }
}

module.exports = {
  SESSION_KEY,
  clearSession,
  getStoredSession,
  isRecoverableSessionError,
  getValidSession,
  getCurrentUser,
  signInWithPassword,
  sendRegisterCode,
  registerWithEmail,
  refreshSession,
  signOut
};
