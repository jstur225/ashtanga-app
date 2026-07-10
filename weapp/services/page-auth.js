const auth = require('./auth');

async function requireUser() {
  try {
    const user = await auth.getCurrentUser();
    if (user) {
      return user;
    }
  } catch (error) {
    // auth 模块会在 refresh token 失效时清理本地会话。
  }

  wx.reLaunch({
    url: '/pages/index/index'
  });
  return null;
}

module.exports = {
  requireUser
};
