"use client"

import { AlertCircle, CheckCircle, Lock, Mail } from 'lucide-react'

interface AuthErrorMessageProps {
  error: string
}

function AuthErrorMessage({ error }: AuthErrorMessageProps) {
  if (!error) return null
  return (
    <div className="flex items-center gap-2 text-red-500 text-sm font-serif bg-red-50 p-3 rounded-lg">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {error}
    </div>
  )
}

function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null
  return (
    <div className="text-xs font-serif text-muted-foreground space-y-1 bg-secondary rounded-lg p-3">
      <p className="font-medium">密码要求：</p>
      <ul className="pl-4 space-y-1">
        <li className={`font-serif ${password.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
          {password.length >= 8 ? '✓' : '✗'} 至少8位字符
        </li>
        <li className={`font-serif ${/[a-zA-Z]/.test(password) ? 'text-green-600' : 'text-red-600'}`}>
          {/[a-zA-Z]/.test(password) ? '✓' : '✗'} 包含字母
        </li>
        <li className={`font-serif ${/\d/.test(password) ? 'text-green-600' : 'text-red-600'}`}>
          {/\d/.test(password) ? '✓' : '✗'} 包含数字
        </li>
      </ul>
    </div>
  )
}

interface FieldProps {
  label: string
  icon: 'mail' | 'lock'
  type: 'email' | 'password' | 'text'
  value: string
  onChange: (value: string) => void
  placeholder: string
  minLength?: number
  maxLength?: number
  centered?: boolean
}

function AuthField({
  label,
  icon,
  type,
  value,
  onChange,
  placeholder,
  minLength,
  maxLength,
  centered,
}: FieldProps) {
  const Icon = icon === 'mail' ? Mail : Lock
  return (
    <div>
      <label className="block text-sm font-medium font-serif text-foreground mb-2">
        {label}
      </label>
      <div className="relative">
        {!centered && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          minLength={minLength}
          maxLength={maxLength}
          className={
            centered
              ? "w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary text-center text-2xl tracking-widest font-serif"
              : "w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary font-serif"
          }
          required
        />
      </div>
    </div>
  )
}

interface ForgotPasswordFormProps {
  fpStep: 'email' | 'verify' | 'new-password'
  email: string
  setEmail: (value: string) => void
  verifyCode: string
  setVerifyCode: (value: string) => void
  newPassword: string
  setNewPassword: (value: string) => void
  confirmNewPassword: string
  setConfirmNewPassword: (value: string) => void
  countdown: number
  loading: boolean
  error: string
  setError: (value: string) => void
  onSendVerificationCode: () => void
  onVerifyCode: () => void
  onUpdatePassword: () => void
}

export function ForgotPasswordForm({
  fpStep,
  email,
  setEmail,
  verifyCode,
  setVerifyCode,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  countdown,
  loading,
  error,
  setError,
  onSendVerificationCode,
  onVerifyCode,
  onUpdatePassword,
}: ForgotPasswordFormProps) {
  return (
    <div className="space-y-4">
      {fpStep === 'email' && (
        <>
          <AuthField
            label="邮箱地址"
            icon="mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="your@email.com"
          />
          <button
            onClick={onSendVerificationCode}
            disabled={loading}
            className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
          >
            {loading ? '发送中...' : '发送验证码'}
          </button>
        </>
      )}

      {fpStep === 'verify' && (
        <>
          <VerificationSentNotice email={email} />
          <AuthField
            label="请输入6位验证码"
            icon="lock"
            type="text"
            value={verifyCode}
            onChange={(value) => setVerifyCode(value.replace(/\D/g, '').slice(0, 6))}
            placeholder="______"
            maxLength={6}
            centered
          />
          <button
            onClick={onVerifyCode}
            disabled={loading || verifyCode.length !== 6}
            className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
          >
            {loading ? '验证中...' : '下一步'}
          </button>
          <ResendButton countdown={countdown} onClick={onSendVerificationCode} />
        </>
      )}

      {fpStep === 'new-password' && (
        <>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-4">
            <p className="text-sm font-serif text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              验证成功，请设置新密码
            </p>
          </div>
          <AuthField
            label="新密码"
            icon="lock"
            type="password"
            value={newPassword}
            onChange={(value) => {
              setNewPassword(value)
              setError('')
            }}
            placeholder="至少8位字符，包含字母和数字"
            minLength={8}
          />
          <AuthField
            label="确认新密码"
            icon="lock"
            type="password"
            value={confirmNewPassword}
            onChange={(value) => {
              setConfirmNewPassword(value)
              setError('')
            }}
            placeholder="再次输入新密码"
            minLength={8}
          />
          <PasswordRequirements password={newPassword} />
          <button
            onClick={onUpdatePassword}
            disabled={loading}
            className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
          >
            {loading ? '修改中...' : '确认修改'}
          </button>
        </>
      )}

      <AuthErrorMessage error={error} />
    </div>
  )
}

interface RegisterFormProps {
  registerStep: 'form' | 'verify'
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  registerVerifyCode: string
  setRegisterVerifyCode: (value: string) => void
  registerCountdown: number
  registeringCountdown: number
  loading: boolean
  error: string
  onClose: () => void
  onResendRegisterCode: () => void
}

export function RegisterForm({
  registerStep,
  email,
  setEmail,
  password,
  setPassword,
  registerVerifyCode,
  setRegisterVerifyCode,
  registerCountdown,
  registeringCountdown,
  loading,
  error,
  onClose,
  onResendRegisterCode,
}: RegisterFormProps) {
  if (registerStep === 'verify') {
    return (
      <>
        <VerificationSentNotice email={email} />
        <AuthField
          label="请输入6位验证码"
          icon="lock"
          type="text"
          value={registerVerifyCode}
          onChange={(value) => setRegisterVerifyCode(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="______"
          maxLength={6}
          centered
        />
        <button
          type="submit"
          disabled={loading || registerVerifyCode.length !== 6}
          className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
        >
          {loading
            ? registeringCountdown > 0
              ? `注册中...(${registeringCountdown}s)`
              : '注册中...'
            : '确认并注册'
          }
        </button>
        <ResendButton countdown={registerCountdown} onClick={onResendRegisterCode} />
        <AuthErrorMessage error={error} />
      </>
    )
  }

  return (
    <>
      <AuthField
        label="邮箱地址"
        icon="mail"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="your@email.com"
      />
      <AuthField
        label="密码"
        icon="lock"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="至少8位字符"
        minLength={8}
      />
      <PasswordRequirements password={password} />
      <AuthErrorMessage error={error} />
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
        >
          {loading ? '发送中...' : '发送验证码'}
        </button>
      </div>
      <p className="text-[10px] font-serif text-muted-foreground text-center mt-4">
        绑定邮箱即表示您同意我们存储您的数据
      </p>
    </>
  )
}

interface LoginFormProps {
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  loading: boolean
  error: string
  onClose: () => void
  onForgotPassword: () => void
}

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  error,
  onClose,
  onForgotPassword,
}: LoginFormProps) {
  return (
    <>
      <AuthField
        label="邮箱地址"
        icon="mail"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="your@email.com"
      />
      <div>
        <AuthField
          label="密码"
          icon="lock"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="至少8位字符"
          minLength={8}
        />
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs font-serif text-primary hover:underline"
          >
            忘记密码？
          </button>
        </div>
      </div>
      <AuthErrorMessage error={error} />
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all font-serif"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </div>
    </>
  )
}

function VerificationSentNotice({ email }: { email: string }) {
  return (
    <div className="rounded-xl p-4 border-2 border-orange-300/30 mb-4 bg-gradient-to-br from-orange-50/90 to-orange-100/70 backdrop-blur-md shadow-[0_4px_16px_rgba(251,146,60,0.2)]">
      <p className="text-sm font-serif text-orange-700">验证码已发送到：</p>
      <p className="text-sm font-serif text-orange-900 font-medium break-all">{email}</p>
    </div>
  )
}

function ResendButton({ countdown, onClick }: { countdown: number; onClick: () => void }) {
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={onClick}
        disabled={countdown > 0}
        className="text-xs font-serif text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {countdown > 0 ? `重新发送(${countdown}s)` : '重新发送验证码'}
      </button>
    </div>
  )
}
