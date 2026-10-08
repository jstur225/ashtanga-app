const auth = require('./auth');
const { authenticatedRequest } = require('./practice-records');
const { appApiRequest } = require('../utils/request');

async function getUserProfile() {
  const fields = ['id', 'user_id', 'name', 'signature', 'avatar', 'historical_days', 'historical_avg_minutes', 'created_at', 'updated_at'].join(',');
  const result = await authenticatedRequest(`/rest/v1/user_profiles?select=${fields}&order=created_at.desc&limit=1`, {
    method: 'GET',
    header: { Accept: 'application/json' }
  });
  return Array.isArray(result) ? result[0] || null : result;
}

async function saveUserProfile(profile) {
  const session = await auth.getValidSession();
  if (!session || !session.user) throw new Error('请先登录');
  const result = await appApiRequest('/api/sync/upload-profile', {
    method: 'POST',
    header: { Authorization: `Bearer ${session.access_token}` },
    data: {
      userId: session.user.id,
      profile: {
        name: profile.name,
        signature: profile.signature,
        avatar: profile.avatar || null,
        email: session.user.email || null,
        historical_days: Number(profile.historical_days) || 0,
        historical_avg_minutes: Number(profile.historical_avg_minutes) || 0,
        updated_at: profile.updated_at || new Date().toISOString()
      }
    }
  });
  return result && result.data ? result.data : profile;
}

module.exports = { getUserProfile, saveUserProfile };
