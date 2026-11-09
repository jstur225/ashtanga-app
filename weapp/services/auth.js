const { supabaseRequest, appApiRequest } = require('../utils/request');
const runtimeErrors = require('./runtime-errors');

const SESSION_KEY = 'supabase_session';
const REFRESH_EARLY_SECONDS = 60;
let refreshPromise = null;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

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

function credentialProbe(nonce, credential) {
  let first = 2166136261 >>> 0;
  let second = 5381 >>> 0;
  const value = `${nonce}\u0000${credential}`;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 16777619) >>> 0;
    second = (Math.imul(second, 33) ^ code) >>> 0;
  }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`;
}

function authDiagnosticDetails(diagnostics) {
  const source = diagnostics && typeof diagnostics === 'object' ? diagnostics : {};
  return {
    server_attempt_id: String(source.attempt_id || '').slice(0, 100),
    credential_transport_match: source.credential_transport_match === true,
    server_credential_character_count: Number(source.server_credential_character_count) || 0,
    server_credential_utf8_byte_count: Number(source.server_credential_utf8_byte_count) || 0,
    supabase_project_ref: String(source.supabase_project_ref || '').slice(0, 80),
    provider_error_code: String(source.provider_error_code || '').slice(0, 100),
    provider_error_status: Number(source.provider_error_status) || 0,
    provider_error_name: String(source.provider_error_name || '').slice(0, 100)
  };
}

async function signInWithPassword(email, password, diagnostics = {}) {
  const normalizedEmail = normalizeEmail(email);
  const emailParts = normalizedEmail.split('@');
  const credential = typeof password === 'string' ? password : String(password || '');
  const diagnosticAttemptId = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const diagnosticNonce = `${diagnosticAttemptId}-${Math.random().toString(36).slice(2, 12)}`;
  const trace = runtimeErrors.startTrace('auth', 'password_sign_in', {
    input_source: diagnostics.inputSource || 'unknown',
    email_domain: emailParts.length === 2 ? emailParts[1] : '',
    email_local_character_count: emailParts[0] ? emailParts[0].length : 0,
    credential_character_count: credential.length,
    credential_has_outer_whitespace: credential.trim() !== credential,
    credential_has_any_whitespace: /\s/.test(credential),
    credential_is_ascii: Array.from(credential).every((character) => character.charCodeAt(0) <= 127),
    credential_has_ascii_letter: /[a-zA-Z]/.test(credential),
    credential_has_digit: /\d/.test(credential)
  });
  try {
    const data = await appApiRequest('/api/auth/login', {
      method: 'POST',
      data: {
        email: normalizedEmail,
        password: credential,
        diagnostic_attempt_id: diagnosticAttemptId,
        diagnostic_nonce: diagnosticNonce,
        diagnostic_probe: credentialProbe(diagnosticNonce, credential)
      }
    });
    const session = saveSession(data);
    runtimeErrors.finishTrace(trace, 'success', {
      has_user: Boolean(session.user),
      ...authDiagnosticDetails(data && data.diagnostics)
    });
    return session;
  } catch (error) {
    runtimeErrors.finishTrace(trace, 'error', {
      status_code: error && error.statusCode,
      message: error && error.message,
      ...authDiagnosticDetails(error && error.body && error.body.diagnostics)
    });
    throw error;
  }
}

async function sendRegisterCode(email) {
  return appApiRequest('/api/auth/send-verification-code', {
    method: 'POST',
    data: {
      email: normalizeEmail(email),
      type: 'email_verification'
    }
  });
}

async function sendResetCode(email) {
  return appApiRequest('/api/auth/send-verification-code', {
    method: 'POST',
    data: { email: normalizeEmail(email), type: 'reset_password' }
  });
}

async function verifyResetCode(email, code) {
  return appApiRequest('/api/auth/verify-code', {
    method: 'POST',
    data: { email: normalizeEmail(email), code, type: 'reset_password' }
  });
}

async function resetPassword(email, newPassword, code) {
  return appApiRequest('/api/auth/reset-password', {
    method: 'POST',
    data: { email: normalizeEmail(email), newPassword, code }
  });
}

async function registerWithEmail(email, password, verificationCode) {
  const trace = runtimeErrors.startTrace('auth', 'register');
  try {
    await appApiRequest('/api/auth/register', {
      method: 'POST',
      data: {
        email: normalizeEmail(email),
        password,
        verificationCode
      }
    });
    const session = await signInWithPassword(email, password);
    runtimeErrors.finishTrace(trace, 'success');
    return session;
  } catch (error) {
    runtimeErrors.finishTrace(trace, 'error', {
      status_code: error && error.statusCode,
      message: error && error.message
    });
    throw error;
  }
}

async function refreshSession(refreshToken) {
  if (refreshPromise) {
    return refreshPromise;
  }

  const trace = runtimeErrors.startTrace('auth', 'session_refresh');
  refreshPromise = supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    data: { refresh_token: refreshToken }
  })
    .then((data) => {
      const session = saveSession(data);
      runtimeErrors.finishTrace(trace, 'success');
      return session;
    })
    .catch((error) => {
      clearSession();
      runtimeErrors.finishTrace(trace, 'error', {
        status_code: error && error.statusCode,
        message: error && error.message
      });
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
      runtimeErrors.recordEvent('auth', 'recoverable_session_error', {
        status_code: error.statusCode,
        message: error.message
      }, { level: 'warning' });
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

async function changePassword(email, currentPassword, newPassword) {
  const verified = await signInWithPassword(email, currentPassword);
  const session = await getValidSession();
  if (!verified || !session) throw new Error('当前密码验证失败');
  return supabaseRequest('/auth/v1/user', {
    method: 'PUT',
    header: { Authorization: `Bearer ${session.access_token}` },
    data: { password: newPassword }
  });
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
    runtimeErrors.recordEvent('auth', 'signed_out');
  }
}

module.exports = {
  SESSION_KEY,
  normalizeEmail,
  clearSession,
  getStoredSession,
  isRecoverableSessionError,
  getValidSession,
  getCurrentUser,
  changePassword,
  signInWithPassword,
  sendRegisterCode,
  sendResetCode,
  verifyResetCode,
  resetPassword,
  registerWithEmail,
  refreshSession,
  signOut
};
