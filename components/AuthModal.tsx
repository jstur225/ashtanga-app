"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ForgotPasswordForm, LoginForm, RegisterForm } from '@/components/AuthModalForms'
import { useAuth } from '@/hooks/useAuth'
import { useForgotPasswordFlow } from '@/hooks/useForgotPasswordFlow'
import { useRegisterFlow } from '@/hooks/useRegisterFlow'
import { isAuthNetworkError, translateAuthError, type AuthMode } from '@/lib/auth-modal-utils'

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
  const [canRetryLogin, setCanRetryLogin] = useState(false)
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
    setCanRetryLogin(false)
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

  // ==================== 提交处理 ====================
  const attemptLogin = async () => {
    setError('')
    setCanRetryLogin(false)
    setLoading(true)
    const attemptId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const startedAt = Date.now()
    const connection = (navigator as Navigator & { connection?: Record<string, unknown> }).connection
    const diagnosticContext = {
      attemptId,
      path: window.location.pathname,
      online: navigator.onLine,
      visibilityState: document.visibilityState,
      displayMode: typeof window.matchMedia === 'function'
        && window.matchMedia('(display-mode: standalone)').matches
        ? 'standalone'
        : 'browser',
      targetOrigin: (() => {
        try {
          return process.env.NEXT_PUBLIC_SUPABASE_URL
            ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
            : null
        } catch {
          return null
        }
      })(),
      connection: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      } : 'Not supported',
    }
    window.__ashtangaRuntimeDiagnostic?.('auth_sign_in_started', diagnosticContext)

    try {
      const { error: signInError } = await signIn(email, password) as any
      if (signInError) throw signInError
      window.__ashtangaRuntimeDiagnostic?.('auth_sign_in_succeeded', {
        ...diagnosticContext,
        elapsedMs: Date.now() - startedAt,
      })
      onAuthSuccess()
      onClose()
    } catch (caughtError: unknown) {
      const authError = caughtError as { message?: string; name?: string; code?: string; status?: number }
      const message = authError?.message || String(caughtError)
      const networkError = isAuthNetworkError(message)
      setCanRetryLogin(networkError)
      setError(translateAuthError(message) || '操作失败，请重试')
      window.__ashtangaRuntimeDiagnostic?.('auth_sign_in_failed', {
        ...diagnosticContext,
        elapsedMs: Date.now() - startedAt,
        networkError,
        errorName: authError?.name || null,
        errorCode: authError?.code || null,
        httpStatus: authError?.status || null,
        errorMessage: message.slice(0, 500),
      })
    } finally {
      setLoading(false)
    }
  }

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

    await attemptLogin()
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
              <ForgotPasswordForm
                fpStep={fpStep}
                email={email}
                setEmail={setEmail}
                verifyCode={verifyCode}
                setVerifyCode={setVerifyCode}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmNewPassword={confirmNewPassword}
                setConfirmNewPassword={setConfirmNewPassword}
                countdown={countdown}
                loading={loading}
                error={error}
                setError={setError}
                onSendVerificationCode={handleSendVerificationCode}
                onVerifyCode={handleVerifyCode}
                onUpdatePassword={handleUpdatePassword}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' ? (
                  <RegisterForm
                    registerStep={registerStep}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    registerVerifyCode={registerVerifyCode}
                    setRegisterVerifyCode={setRegisterVerifyCode}
                    registerCountdown={registerCountdown}
                    registeringCountdown={registeringCountdown}
                    loading={loading}
                    error={error}
                    onClose={onClose}
                    onResendRegisterCode={() => {
                      void resendRegisterCode({ email, setError, setLoading })
                    }}
                  />
                ) : (
                  <LoginForm
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    loading={loading}
                    error={error}
                    onClose={onClose}
                    onForgotPassword={() => {
                      onModeChange('forgot-password')
                      setFpStep('email')
                      setError('')
                    }}
                  />
                )}
                {mode === 'login' && canRetryLogin && (
                  <button
                    type="button"
                    onClick={() => void attemptLogin()}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-secondary text-primary rounded-xl border border-primary/30 hover:bg-secondary/80 transition-all disabled:opacity-50 font-serif"
                  >
                    {loading ? '重新连接中...' : '重新尝试登录'}
                  </button>
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
