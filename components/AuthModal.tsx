"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Mail, Lock, AlertCircle, X, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useForgotPasswordFlow } from '@/hooks/useForgotPasswordFlow'
import { useRegisterFlow } from '@/hooks/useRegisterFlow'
import { translateAuthError, type AuthMode } from '@/lib/auth-modal-utils'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: AuthMode
  onAuthSuccess: () => void
  onModeChange: (mode: AuthMode) => void
}

export function AuthModal({ isOpen, onClose, mode, onAuthSuccess, onModeChange }: AuthModalProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const forgotPasswordFlow = useForgotPasswordFlow()
  const registerFlow = useRegisterFlow()
  const {
    fpStep,
    setFpStep,
    verifyCode,
    setVerifyCode,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    countdown,
    resetForgotPasswordFlow,
    sendVerificationCode,
    verifyResetCode,
    updatePassword,
  } = forgotPasswordFlow
  const {
    registerStep,
    registerVerifyCode,
    setRegisterVerifyCode,
    registerCountdown,
    registeringCountdown,
    resetRegisterFlow,
    resendRegisterCode,
    submitRegister,
  } = registerFlow

  // ==================== 模式切换时重置状态 ====================
  useEffect(() => {
    // 当模式切换时，重置所有步骤和错误
    resetRegisterFlow()
    resetForgotPasswordFlow()
    setError('')
  }, [mode, resetForgotPasswordFlow, resetRegisterFlow])

  // ==================== Esc 键关闭弹窗 ====================
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onClose])

  // ==================== 密码强度验证 ====================
  // ==================== 提交处理 ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'register') {
      await submitRegister({
        email,
        password,
        setError,
        setLoading,
        onAuthSuccess,
        onClose,
      })
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password) as any
        if (error) throw error
        onAuthSuccess()
        onClose()
        return
      }
    } catch (err: any) {
      setError(translateAuthError(err.message) || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSendVerificationCode = () => {
    void sendVerificationCode({ email, setError, setLoading })
  }

  const handleVerifyCode = () => {
    void verifyResetCode({ email, setError, setLoading })
  }

  const handleUpdatePassword = () => {
    void updatePassword({ email, setEmail, setError, setLoading, onModeChange })
  }

  return (
    typeof window !== 'undefined' && isOpen && createPortal(
      <>
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        />

        {/* Modal - 居中显示 */}
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 pointer-events-none">
          <div className="bg-card rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto pointer-events-auto">
            <div className="p-6 pb-10">
            {/* 标题栏 - 带关闭按钮（忘记密码模式显示返回登录按钮） */}
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-serif text-foreground">
                {mode === 'register' ? '📧 绑定邮箱账号' :
                 mode === 'forgot-password' ? '🔑 忘记密码' :
                 '🔐 登录'}
              </h2>

              {mode === 'forgot-password' ? (
                <button
                  type="button"
                  onClick={() => {
                    onModeChange('login')
                    setFpStep('email')
                    setError('')
                  }}
                  className="text-sm font-serif text-muted-foreground hover:text-foreground transition-colors"
                >
                  返回登录
                </button>
              ) : (
                <button onClick={onClose} aria-label="关闭" className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {mode === 'register' && (
              <p className="text-xs font-serif mb-5" style={{ color: '#b8860b' }}>
                🎁 绑定邮箱即享31天Pro会员
              </p>
            )}

            {mode === 'forgot-password' ? (
              // ==================== 忘记密码 - 3步流程 ====================
              <div className="space-y-4">
                {/* 步骤1：输入邮箱 */}
                {fpStep === 'email' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium font-serif text-foreground mb-2">
                        邮箱地址
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary font-serif"
                          required
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSendVerificationCode}
                      disabled={loading}
                      className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
                    >
                      {loading ? '发送中...' : '发送验证码'}
                    </button>
                  </>
                )}

                {/* 步骤2：输入验证码 */}
                {fpStep === 'verify' && (
                  <>
                    <div className="rounded-xl p-4 border-2 border-orange-300/30 mb-4 bg-gradient-to-br from-orange-50/90 to-orange-100/70 backdrop-blur-md shadow-[0_4px_16px_rgba(251,146,60,0.2)]">
                      <p className="text-sm font-serif text-orange-700">验证码已发送到：</p>
                      <p className="text-sm font-serif text-orange-900 font-medium break-all">{email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium font-serif text-foreground mb-2">
                        请输入6位验证码
                      </label>
                      <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => {
                          // 只允许输入数字
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setVerifyCode(value)
                        }}
                        placeholder="______"
                        maxLength={6}
                        className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary text-center text-2xl tracking-widest font-serif"
                        required
                      />
                    </div>

                    <button
                      onClick={handleVerifyCode}
                      disabled={loading || verifyCode.length !== 6}
                      className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
                    >
                      {loading ? '验证中...' : '下一步'}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={countdown > 0}
                        className="text-xs font-serif text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {countdown > 0 ? `重新发送(${countdown}s)` : '重新发送验证码'}
                      </button>
                    </div>
                  </>
                )}

                {/* 步骤3：设置新密码 */}
                {fpStep === 'new-password' && (
                  <>
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-4">
                      <p className="text-sm font-serif text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        验证成功，请设置新密码
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium font-serif text-foreground mb-2">
                        新密码
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value)
                            setError('')
                          }}
                          placeholder="至少8位字符，包含字母和数字"
                          minLength={8}
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary font-serif"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium font-serif text-foreground mb-2">
                        确认新密码
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => {
                            setConfirmNewPassword(e.target.value)
                            setError('')
                          }}
                          placeholder="再次输入新密码"
                          minLength={8}
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary font-serif"
                          required
                        />
                      </div>
                    </div>

                    {/* 密码强度提示 */}
                    {newPassword && (
                      <div className="text-xs font-serif text-muted-foreground space-y-1 bg-secondary rounded-lg p-3">
                        <p className="font-medium">密码要求：</p>
                        <ul className="pl-4 space-y-1">
                          <li className={`font-serif ${newPassword.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                            {newPassword.length >= 8 ? '✓' : '✗'} 至少8位字符
                          </li>
                          <li className={`font-serif ${/[a-zA-Z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                            {/[a-zA-Z]/.test(newPassword) ? '✓' : '✗'} 包含字母
                          </li>
                          <li className={`font-serif ${/\d/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                            {/\d/.test(newPassword) ? '✓' : '✗'} 包含数字
                          </li>
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={handleUpdatePassword}
                      disabled={loading}
                      className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50 font-serif"
                    >
                      {loading ? '修改中...' : '确认修改'}
                    </button>
                  </>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm font-serif bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>
            ) : (
              // ==================== 登录/注册表单 ====================
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 注册模式 - 第1步：输入邮箱密码 */}
                {mode === 'register' && registerStep === 'form' && (
                  <>
                    {/* 邮箱输入 */}
                    <div>
                      <label className="block text-sm font-medium font-serif text-foreground mb-2">
                        邮箱地址
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary font-serif"
                          required
                        />
                      </div>
                    </div>

                    {/* 密码输入 */}
                    <div>
                      <label className="block text-sm font-medium font-serif text-foreground mb-2">
                        密码
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="至少8位字符"
                          minLength={8}
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary font-serif"
                          required
                        />
                      </div>
                    </div>

                    {/* 密码强度提示 */}
                    {password && (
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
                    )}

                    {/* 错误提示 */}
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 text-sm font-serif bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    {/* 按钮 */}
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

                    {/* 提示文本 */}
                    <p className="text-[10px] font-serif text-muted-foreground text-center mt-4">
                      绑定邮箱即表示您同意我们存储您的数据
                    </p>
                  </>
                )}

                {/* 注册模式 - 第2步：输入验证码 */}
                {mode === 'register' && registerStep === 'verify' && (
                  <>
                    <div className="rounded-xl p-4 border-2 border-orange-300/30 mb-4 bg-gradient-to-br from-orange-50/90 to-orange-100/70 backdrop-blur-md shadow-[0_4px_16px_rgba(251,146,60,0.2)]">
                      <p className="text-sm font-serif text-orange-700">验证码已发送到：</p>
                      <p className="text-sm font-serif text-orange-900 font-medium break-all">{email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium font-serif text-foreground mb-2">
                        请输入6位验证码
                      </label>
                      <input
                        type="text"
                        value={registerVerifyCode}
                        onChange={(e) => {
                          // 只允许输入数字
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setRegisterVerifyCode(value)
                        }}
                        placeholder="______"
                        maxLength={6}
                        className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary text-center text-2xl tracking-widest font-serif"
                        required
                      />
                    </div>

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

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          void resendRegisterCode({ email, setError, setLoading })
                        }}
                        disabled={registerCountdown > 0}
                        className="text-xs font-serif text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {registerCountdown > 0 ? `重新发送(${registerCountdown}s)` : '重新发送验证码'}
                      </button>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 text-sm font-serif bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}
                  </>
                )}

                {/* 登录模式 */}
                {mode === 'login' && (
                  <>
                    {/* 邮箱输入 */}
                    <div>
                      <label className="block text-sm font-medium font-serif text-foreground mb-2">
                        邮箱地址
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary font-serif"
                          required
                        />
                      </div>
                    </div>

                    {/* 密码输入 */}
                    <div>
                      <label className="block text-sm font-medium font-serif text-foreground mb-2">
                        密码
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="至少8位字符"
                          minLength={8}
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary font-serif"
                          required
                        />
                      </div>

                      {/* 忘记密码链接 */}
                      <div className="mt-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            onModeChange('forgot-password')
                            setFpStep('email')
                            setError('')
                          }}
                          className="text-xs font-serif text-primary hover:underline"
                        >
                          忘记密码？
                        </button>
                      </div>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 text-sm font-serif bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    {/* 按钮 */}
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
                )}
              </form>
            )}
            </div>
          </div>
        </div>
      </>
    , document.body)
  )
}
