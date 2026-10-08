const auth = require('../../services/auth');
const dataRepository = require('../../services/data-repository');
const { getAgreement } = require('../../content/agreements');

function resolveSubmittedLoginCredentials(event, state = {}) {
  const values = event && event.detail && event.detail.value && typeof event.detail.value === 'object'
    ? event.detail.value
    : {};
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(values, key);

  return {
    email: auth.normalizeEmail(hasOwn('email') ? values.email : state.email),
    password: String(hasOwn('password') ? values.password : (state.password || '')),
    source: hasOwn('email') && hasOwn('password') ? 'native_form' : 'component_state'
  };
}

Component({
  properties: {
    show: { type: Boolean, value: false },
    initialMode: { type: String, value: 'login' }
  },

  data: {
    primaryButtonStyle: 'background-image:linear-gradient(to top left,rgba(74,122,68,.7),rgba(45,90,39,.85));',
    mode: 'login',
    registerStep: 'form',
    email: '',
    password: '',
    verificationCode: '',
    forgotStep: 'email',
    newPassword: '',
    confirmNewPassword: '',
    resendCountdown: 0,
    submitLoading: false,
    codeLoading: false,
    hasAgreed: false,
    agreementVisible: false,
    agreement: getAgreement('privacy'),
    message: '',
    messageType: 'info',
    passwordLengthValid: false,
    passwordLetterValid: false,
    passwordNumberValid: false
  },

  observers: {
    'show, initialMode': function resetWhenOpened(show, initialMode) {
      if (!show) {
        this.clearCountdown(false);
        return;
      }
      this.setData({
        mode: initialMode || 'login',
        registerStep: 'form',
        message: '',
        forgotStep: 'email',
        verificationCode: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      this.resumeCountdown();
    }
  },

  lifetimes: {
    detached() { this.clearCountdown(false); }
  },

  methods: {
    close() {
      if (this.data.submitLoading || this.data.codeLoading) return;
      this.clearCountdown(false);
      this.triggerEvent('close');
    },
    stopPropagation() {},
    switchMode(event) {
      this.setData({
        mode: event.currentTarget.dataset.mode,
        registerStep: 'form',
        message: '',
        forgotStep: 'email',
        verificationCode: ''
      });
    },
    openForgotPassword() {
      this.setData({ mode: 'forgot-password', forgotStep: 'email', verificationCode: '', message: '' });
    },
    backToLogin() {
      this.setData({ mode: 'login', forgotStep: 'email', verificationCode: '', message: '' });
    },
    onEmailInput(event) { this.setData({ email: auth.normalizeEmail(event.detail.value), message: '' }); },
    onPasswordInput(event) {
      const password = event.detail.value;
      this.setData({
        password,
        passwordLengthValid: password.length >= 8,
        passwordLetterValid: /[a-zA-Z]/.test(password),
        passwordNumberValid: /\d/.test(password),
        message: ''
      });
    },
    onCodeInput(event) {
      this.setData({ verificationCode: event.detail.value.replace(/\D/g, '').slice(0, 6), message: '' });
    },
    onNewPasswordInput(event) { this.setData({ newPassword: event.detail.value, message: '' }); },
    onConfirmNewPasswordInput(event) { this.setData({ confirmNewPassword: event.detail.value, message: '' }); },
    onAgreementChange(event) {
      this.setData({ hasAgreed: event.detail.value.includes('agreed'), message: '' });
    },
    onOpenAgreement(event) {
      this.setData({ agreement: getAgreement(event.currentTarget.dataset.type), agreementVisible: true });
    },
    onCloseAgreement() { this.setData({ agreementVisible: false }); },
    validatePassword(password) {
      if (password.length < 8) return '密码至少需要 8 位';
      if (!/[a-zA-Z]/.test(password)) return '密码必须包含字母';
      if (!/\d/.test(password)) return '密码必须包含数字';
      return '';
    },
    ensureAgreement() {
      if (this.data.hasAgreed) return true;
      this.showMessage('请先阅读并勾选同意《用户协议》和《隐私政策》', 'error');
      return false;
    },
    validateCredentials(requireCode, credentials = {}) {
      const email = credentials.email === undefined ? this.data.email : credentials.email;
      const password = credentials.password === undefined ? this.data.password : credentials.password;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '请输入正确的邮箱地址';
      if (!password) return '请输入密码';
      if (requireCode) {
        const passwordError = this.validatePassword(password);
        if (passwordError) return passwordError;
        if (this.data.verificationCode.length !== 6) return '请输入 6 位邮箱验证码';
      }
      return '';
    },
    async sendCode() {
      if (this.data.codeLoading) return;
      if (this.data.resendCountdown > 0) {
        return this.showMessage(`请等待 ${this.data.resendCountdown} 秒后重新发送`, 'info');
      }
      if (!this.ensureAgreement()) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.data.email)) return this.showMessage('请输入正确的邮箱地址', 'error');
      const passwordError = this.validatePassword(this.data.password);
      if (passwordError) return this.showMessage(passwordError, 'error');
      this.setData({ codeLoading: true, message: '' });
      try {
        const delivery = await auth.sendRegisterCode(this.data.email);
        this.setData({ registerStep: 'verify', verificationCode: '' });
        this.startCountdown(60);
        this.showMessage(delivery.message || '验证码邮件已提交，请检查收件箱和垃圾邮件', 'success');
      } catch (error) {
        this.showMessage(this.translateError(error), 'error');
      } finally {
        this.setData({ codeLoading: false });
      }
    },
    async submitAuth(event) {
      if (this.data.submitLoading) return;
      if (!this.ensureAgreement()) return;
      const isRegister = this.data.mode === 'register';
      const credentials = isRegister
        ? { email: this.data.email, password: this.data.password, source: 'component_state' }
        : resolveSubmittedLoginCredentials(event, this.data);
      const validationError = this.validateCredentials(isRegister, credentials);
      if (validationError) return this.showMessage(validationError, 'error');
      this.setData({
        email: credentials.email,
        password: credentials.password,
        submitLoading: true,
        message: ''
      });
      try {
        const session = isRegister
          ? await auth.registerWithEmail(credentials.email, credentials.password, this.data.verificationCode)
          : await auth.signInWithPassword(credentials.email, credentials.password, {
            inputSource: credentials.source
          });
        this.completeLogin(session, isRegister);
      } catch (error) {
        this.showMessage(this.translateError(error), 'error');
      } finally {
        this.setData({ submitLoading: false });
      }
    },
    completeLogin(session, isRegister = false) {
      wx.setStorageSync('agreement_consent', {
        termsVersion: '2026-07-09', privacyVersion: '2026-07-09', acceptedAt: new Date().toISOString(),
        userId: session.user && session.user.id ? session.user.id : null
      });
      wx.removeStorageSync('weapp_guest_mode_enabled');
      wx.setStorageSync('weapp_account_mode_enabled', true);
      const app = getApp();
      app.globalData.isLoggedIn = true;
      app.globalData.userInfo = session.user;
      app.globalData.dataMode = 'cloud';
      if (isRegister) dataRepository.ensureAccountTutorialFromGuest();
      this.setData({ password: '', verificationCode: '' });
      this.triggerEvent('success', { user: session.user, mode: this.data.mode });
    },
    resendRegisterCode() {
      if (this.data.resendCountdown > 0) {
        return this.showMessage(`请等待 ${this.data.resendCountdown} 秒后重新发送`, 'info');
      }
      this.sendCode();
    },
    async sendResetCode() {
      if (this.data.codeLoading) return;
      if (this.data.resendCountdown > 0) {
        return this.showMessage(`请等待 ${this.data.resendCountdown} 秒后重新发送`, 'info');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.data.email)) return this.showMessage('请输入正确的邮箱地址', 'error');
      this.setData({ codeLoading: true, message: '' });
      try {
        const delivery = await auth.sendResetCode(this.data.email);
        this.setData({ forgotStep: 'verify', verificationCode: '' });
        this.startCountdown(60);
        this.showMessage(delivery.message || `验证码邮件已提交到 ${this.data.email}，请检查垃圾邮件`, 'success');
      } catch (error) {
        this.showMessage(this.translateError(error), 'error');
      } finally {
        this.setData({ codeLoading: false });
      }
    },
    async verifyForgotCode() {
      if (this.data.submitLoading) return;
      if (this.data.verificationCode.length !== 6) return this.showMessage('请输入 6 位邮箱验证码', 'error');
      this.setData({ submitLoading: true, message: '' });
      try {
        await auth.verifyResetCode(this.data.email, this.data.verificationCode);
        this.setData({ forgotStep: 'new-password' });
      } catch (error) {
        this.showMessage(this.translateError(error), 'error');
      } finally {
        this.setData({ submitLoading: false });
      }
    },
    async submitNewPassword() {
      if (this.data.submitLoading) return;
      const passwordError = this.validatePassword(this.data.newPassword);
      if (passwordError) return this.showMessage(passwordError, 'error');
      if (this.data.newPassword !== this.data.confirmNewPassword) return this.showMessage('两次输入的密码不一致', 'error');
      this.setData({ submitLoading: true, message: '' });
      try {
        await auth.resetPassword(this.data.email, this.data.newPassword, this.data.verificationCode);
        this.clearCountdown(true);
        this.setData({ mode: 'login', forgotStep: 'email', password: '', newPassword: '', confirmNewPassword: '', verificationCode: '' });
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
    showMessage(message, messageType) { this.setData({ message, messageType }); },
    translateError(error) {
      const message = error && error.message ? error.message : '操作失败，请稍后重试';
      if (/Invalid login credentials/i.test(message)) return '邮箱或密码不正确';
      if (/session_id claim|session.*does not exist|invalid refresh token/i.test(message)) return '登录状态已过期，请重新登录';
      if (/rate limit|频繁/i.test(message)) return '操作太频繁，请稍后再试';
      if (/Failed to fetch|request:fail|network/i.test(message)) return '网络连接失败，请检查网络后重试';
      return message;
    }
  }
});
