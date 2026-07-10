const auth = require('../../services/auth');
const { getAgreement } = require('../../content/agreements');
const GUEST_MODE_KEY = 'weapp_guest_mode_enabled';

Page({
  data: {
    authLoading: true,
    submitLoading: false,
    codeLoading: false,
    isLoggedIn: false,
    mode: 'login',
    email: '',
    password: '',
    verificationCode: '',
    hasAgreed: false,
    agreementVisible: false,
    agreement: getAgreement('privacy'),
    userEmail: '',
    message: '',
    messageType: 'info'
  },

  onLoad(options = {}) {
    this.forceAccount = options.account === '1';
    this.restoreSession();
  },

  onShow() {
    if (!this.data.authLoading && this.data.isLoggedIn) {
      this.restoreSession();
    }
  },

  async restoreSession() {
    this.setData({ authLoading: true, message: '' });
    try {
      const user = await auth.getCurrentUser();
      this.setAuthState(user);
      if (user) {
        this.enterApp();
      } else if (!this.forceAccount && wx.getStorageSync(GUEST_MODE_KEY)) {
        this.enterGuest();
      }
    } catch (error) {
      this.setData({
        authLoading: false,
        isLoggedIn: false,
        userEmail: '',
        message: this.translateError(error),
        messageType: 'error'
      });
    }
  },

  setAuthState(user) {
    const app = getApp();
    app.globalData.isLoggedIn = Boolean(user);
    app.globalData.userInfo = user || null;
    this.setData({
      authLoading: false,
      isLoggedIn: Boolean(user),
      userEmail: user && user.email ? user.email : '',
      message: user ? '真实账号会话有效' : '',
      messageType: 'success'
    });
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode;
    this.setData({
      mode,
      message: '',
      verificationCode: ''
    });
  },

  onEmailInput(event) {
    this.setData({ email: event.detail.value.trim() });
  },

  onPasswordInput(event) {
    this.setData({ password: event.detail.value });
  },

  onCodeInput(event) {
    this.setData({
      verificationCode: event.detail.value.replace(/\D/g, '').slice(0, 6)
    });
  },

  validateCredentials(requireCode = false) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.data.email)) {
      return '请输入正确的邮箱地址';
    }
    if (this.data.password.length < 8) {
      return '密码至少需要 8 位';
    }
    if (requireCode && this.data.verificationCode.length !== 6) {
      return '请输入 6 位邮箱验证码';
    }
    return '';
  },

  async sendCode() {
    if (!this.ensureAgreement()) {
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.data.email)) {
      this.showMessage('请输入正确的邮箱地址', 'error');
      return;
    }

    this.setData({ codeLoading: true, message: '' });
    try {
      await auth.sendRegisterCode(this.data.email);
      this.showMessage('验证码已发送，请检查邮箱', 'success');
    } catch (error) {
      this.showMessage(this.translateError(error), 'error');
    } finally {
      this.setData({ codeLoading: false });
    }
  },

  async submitAuth() {
    if (!this.ensureAgreement()) {
      return;
    }

    const isRegister = this.data.mode === 'register';
    const validationError = this.validateCredentials(isRegister);
    if (validationError) {
      this.showMessage(validationError, 'error');
      return;
    }

    this.setData({ submitLoading: true, message: '' });
    try {
      const session = isRegister
        ? await auth.registerWithEmail(
            this.data.email,
            this.data.password,
            this.data.verificationCode
          )
        : await auth.signInWithPassword(this.data.email, this.data.password);

      wx.setStorageSync('agreement_consent', {
        termsVersion: '2026-07-09',
        privacyVersion: '2026-07-09',
        acceptedAt: new Date().toISOString(),
        userId: session.user && session.user.id ? session.user.id : null
      });
      wx.removeStorageSync(GUEST_MODE_KEY);
      wx.setStorageSync('weapp_account_mode_enabled', true);
      this.setAuthState(session.user);
      this.setData({ password: '', verificationCode: '' });
      this.enterApp();
    } catch (error) {
      this.showMessage(this.translateError(error), 'error');
    } finally {
      this.setData({ submitLoading: false, authLoading: false });
    }
  },

  enterApp() {
    wx.switchTab({
      url: '/pages/practice/practice'
    });
  },

  enterGuest() {
    const app = getApp();
    app.globalData.isLoggedIn = false;
    app.globalData.userInfo = null;
    app.globalData.dataMode = 'guest';
    wx.setStorageSync(GUEST_MODE_KEY, true);
    this.enterApp();
  },

  showMessage(message, messageType) {
    this.setData({ message, messageType });
  },

  ensureAgreement() {
    if (this.data.hasAgreed) {
      return true;
    }
    this.showMessage('请先阅读并勾选同意《用户协议》和《隐私政策》', 'error');
    return false;
  },

  onAgreementChange(event) {
    this.setData({
      hasAgreed: event.detail.value.includes('agreed'),
      message: ''
    });
  },

  onOpenAgreement(event) {
    const type = event.currentTarget.dataset.type;
    this.setData({
      agreement: getAgreement(type),
      agreementVisible: true
    });
  },

  onCloseAgreement() {
    this.setData({ agreementVisible: false });
  },

  preventTouchMove() {},

  translateError(error) {
    const message = error && error.message ? error.message : '操作失败，请稍后重试';
    if (/Invalid login credentials/i.test(message)) {
      return '邮箱或密码不正确';
    }
    if (/Email not confirmed/i.test(message)) {
      return '邮箱尚未确认，请先完成邮箱验证';
    }
    if (/session_id claim|session.*does not exist|invalid refresh token|refresh token.*invalid/i.test(message)) {
      return '登录状态已过期，请重新登录';
    }
    if (/rate limit|频繁/i.test(message)) {
      return '操作太频繁，请稍后再试';
    }
    if (/Failed to fetch|request:fail|network/i.test(message)) {
      return '网络连接失败，请检查网络后重试';
    }
    return message;
  },

});
