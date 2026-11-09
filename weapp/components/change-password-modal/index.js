const auth = require('../../services/auth');

Component({
  properties: {
    show: { type: Boolean, value: false },
    email: { type: String, value: '' }
  },

  data: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    passwordError: '',
    changingPassword: false,
    passwordHasMinLength: false,
    passwordHasLetter: false,
    passwordHasNumber: false
  },

  observers: {
    show(show) {
      if (!show) return;
      this.resetForm();
    }
  },

  methods: {
    resetForm() {
      this.setData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        passwordError: '',
        changingPassword: false,
        passwordHasMinLength: false,
        passwordHasLetter: false,
        passwordHasNumber: false
      });
    },

    close() {
      if (this.data.changingPassword) return;
      this.triggerEvent('close');
    },

    stopPropagation() {},

    onCurrentPasswordInput(event) {
      this.setData({ currentPassword: event.detail.value, passwordError: '' });
    },

    onNewPasswordInput(event) {
      const value = event.detail.value || '';
      this.setData({
        newPassword: value,
        passwordError: '',
        passwordHasMinLength: value.length >= 8,
        passwordHasLetter: /[a-zA-Z]/.test(value),
        passwordHasNumber: /\d/.test(value)
      });
    },

    onConfirmPasswordInput(event) {
      this.setData({ confirmPassword: event.detail.value, passwordError: '' });
    },

    validateForm() {
      const { currentPassword, newPassword, confirmPassword } = this.data;
      if (!currentPassword || !newPassword || !confirmPassword) return '请填写所有字段';
      if (currentPassword === newPassword) return '新密码不能与原密码相同';
      if (newPassword !== confirmPassword) return '两次输入的新密码不一致';
      if (newPassword.length < 8) return '密码至少需要8位字符';
      if (!/[a-zA-Z]/.test(newPassword)) return '密码必须包含字母';
      if (!/\d/.test(newPassword)) return '密码必须包含数字';
      return '';
    },

    async submitPasswordChange() {
      if (this.data.changingPassword) return;
      const passwordError = this.validateForm();
      if (passwordError) {
        this.setData({ passwordError });
        return;
      }

      const storedSession = auth.getStoredSession();
      const sessionEmail = storedSession && storedSession.user && storedSession.user.email;
      const email = this.properties.email || sessionEmail || '';
      if (!email) {
        this.setData({ passwordError: '没有找到当前登录邮箱，请重新登录后再试' });
        return;
      }

      this.setData({ changingPassword: true, passwordError: '' });
      try {
        await auth.changePassword(email, this.data.currentPassword, this.data.newPassword);
        this.triggerEvent('success');
      } catch (error) {
        const message = error && error.message ? error.message : '';
        this.setData({
          passwordError: /invalid login credentials/i.test(message)
            ? '当前密码输入错误，请重新输入'
            : (message || '修改失败，请重试')
        });
      } finally {
        this.setData({ changingPassword: false });
      }
    }
  }
});
