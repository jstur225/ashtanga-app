Component({
  methods: {
    openRegister() {
      this.triggerEvent('auth', { mode: 'register' });
    },
    openLogin() {
      this.triggerEvent('auth', { mode: 'login' });
    },
    keepLocal() {
      this.triggerEvent('keep-local');
    }
  }
});
