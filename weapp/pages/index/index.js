const auth = require('../../services/auth');
const localData = require('../../services/local-data');
const dataRepository = require('../../services/data-repository');
const practiceShare = require('../../utils/practice-share');
const { getAgreement } = require('../../content/agreements');
const GUEST_MODE_KEY = 'weapp_guest_mode_enabled';

Page({
  ...practiceShare.pageShareHandlers,

  data: {
    authLoading: true,
    submitLoading: false,
    codeLoading: false,
    isLoggedIn: false,
    mode: 'login',
    email: '',
    password: '',
    passwordLengthValid: false,
    passwordLetterValid: false,
    passwordNumberValid: false,
    verificationCode: '',
    forgotStep: 'email',
    newPassword: '',
    confirmNewPassword: '',
    resendCountdown: 0,
    hasAgreed: false,
    agreementVisible: false,
    agreement: getAgreement('privacy'),
    userEmail: '',
    message: '',
    messageType: 'info'
  },

  onLoad(options = {}) {
    practiceShare.showShareMenu();
    practiceShare.redirectTimelineEntryToPractice(options);
    this.forceAccount = options.account === '1';
    this.restoreSession();
  },

  onShow() {
    this.resumeCountdown();
    if (!this.data.authLoading && this.data.isLoggedIn) {
      this.restoreSession();
    }
  },

  onUnload() {
    this.clearCountdown(true);
  },

  async restoreSession() {
    this.setData({ authLoading: true, message: '' });
    try {
      const user = await auth.getCurrentUser();
      this.setAuthState(user);
      if (user) {
        if (this.forceAccount) {
          wx.removeStorageSync(GUEST_MODE_KEY);
          wx.setStorageSync('weapp_account_mode_enabled', true);
        }
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
    app.globalData.dataMode = user && wx.getStorageSync('weapp_account_mode_enabled') && !wx.getStorageSync(GUEST_MODE_KEY)
      ? 'cloud'
      : 'guest';
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
      verificationCode: '',
      forgotStep: 'email',
      newPassword: '',
      confirmNewPassword: ''
    });
  },

  openForgotPassword() {
    this.setData({
      mode: 'forgot-password',
      forgotStep: 'email',
      verificationCode: '',
      newPassword: '',
      confirmNewPassword: '',
      message: ''
    });
  },

  backToLogin() {
    this.setData({ mode: 'login', forgotStep: 'email', message: '', verificationCode: '' });
  },

  onEmailInput(event) {
    this.setData({ email: auth.normalizeEmail(event.detail.value) });
  },

  onPasswordInput(event) {
    const password = event.detail.value;
    this.setData({
      password,
      passwordLengthValid: password.length >= 8,
      passwordLetterValid: /[a-zA-Z]/.test(password),
      passwordNumberValid: /\d/.test(password)
    });
  },

  onCodeInput(event) {
    this.setData({
      verificationCode: event.detail.value.replace(/\D/g, '').slice(0, 6)
    });
  },

  onNewPasswordInput(event) {
    this.setData({ newPassword: event.detail.value, message: '' });
  },

  onConfirmNewPasswordInput(event) {
    this.setData({ confirmNewPassword: event.detail.value, message: '' });
  },

  validatePassword(password) {
    if (password.length < 8) return '密码至少需要 8 位';
    if (!/[a-zA-Z]/.test(password)) return '密码必须包含字母';
    if (!/\d/.test(password)) return '密码必须包含数字';
    if (['12345678', 'password', 'qwerty123', 'abc12345', '11111111'].includes(password.toLowerCase())) {
      return '密码过于简单，请使用更强的密码';
    }
    return '';
  },

  validateCredentials(requireCode = false) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.data.email)) {
      return '请输入正确的邮箱地址';
    }
    const passwordError = this.validatePassword(this.data.password);
    if (passwordError) return passwordError;
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

  async sendResetCode() {
    if (this.data.resendCountdown > 0) {
      this.showMessage(`请等待 ${this.data.resendCountdown} 秒后重新发送`, 'info');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.data.email)) {
      this.showMessage('请输入正确的邮箱地址', 'error');
      return;
    }
    this.setData({ codeLoading: true, message: '' });
    try {
      await auth.sendResetCode(this.data.email);
      this.setData({ forgotStep: 'verify', verificationCode: '' });
      this.startCountdown(60);
      this.showMessage(`验证码已发送到 ${this.data.email}`, 'success');
    } catch (error) {
      this.showMessage(this.translateError(error), 'error');
    } finally {
      this.setData({ codeLoading: false });
    }
  },

  async verifyForgotCode() {
    if (this.data.verificationCode.length !== 6) {
      this.showMessage('请输入 6 位邮箱验证码', 'error');
      return;
    }
    this.setData({ submitLoading: true, message: '' });
    try {
      await auth.verifyResetCode(this.data.email, this.data.verificationCode);
      this.setData({ forgotStep: 'new-password' });
      this.showMessage('验证成功，请设置新密码', 'success');
    } catch (error) {
      this.showMessage(this.translateError(error), 'error');
    } finally {
      this.setData({ submitLoading: false });
    }
  },

  async submitNewPassword() {
    const passwordError = this.validatePassword(this.data.newPassword);
    if (passwordError) {
      this.showMessage(passwordError, 'error');
      return;
    }
    if (this.data.newPassword !== this.data.confirmNewPassword) {
      this.showMessage('两次输入的密码不一致', 'error');
      return;
    }
    this.setData({ submitLoading: true, message: '' });
    try {
      await auth.resetPassword(this.data.email, this.data.newPassword, this.data.verificationCode);
      this.setData({
        mode: 'login',
        forgotStep: 'email',
        password: '',
        newPassword: '',
        confirmNewPassword: '',
        verificationCode: ''
      });
      this.clearCountdown(true);
      this.showMessage('密码修改成功，请使用新密码登录', 'success');
    } catch (error) {
      this.showMessage(this.translateError(error), 'error');
    } finally {
      this.setData({ submitLoading: false });
    }
  },

  startCountdown(seconds) {
    this.clearCountdown(false);
    this.countdownDeadline = Date.now() + Math.max(0, Number(seconds) || 0) * 1000;
    this.resumeCountdown();
  },

  resumeCountdown() {
    this.clearCountdown(false);
    if (!this.countdownDeadline) {
      if (this.data.resendCountdown) this.setData({ resendCountdown: 0 });
      return;
    }
    const update = () => {
      const next = Math.max(0, Math.ceil((this.countdownDeadline - Date.now()) / 1000));
      if (next !== this.data.resendCountdown) this.setData({ resendCountdown: next });
      if (!next) this.clearCountdown(true);
    };
    update();
    if (this.countdownDeadline) this.countdownTimer = setInterval(update, 1000);
  },

  clearCountdown(reset = false) {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = null;
    if (reset) {
      this.countdownDeadline = 0;
      if (this.data.resendCountdown) this.setData({ resendCountdown: 0 });
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
      getApp().globalData.dataMode = 'cloud';
      if (isRegister) dataRepository.ensureAccountTutorialFromGuest();
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
    localData.ensureTutorialRecord();
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
