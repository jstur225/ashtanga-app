"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, AlertCircle, X, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'register' | 'forgot-password'
  onAuthSuccess: () => void
  onModeChange: (mode: 'login' | 'register' | 'forgot-password') => void
}

// 忘记密码的步骤
type ForgotPasswordStep = 'email' | 'verify' | 'new-password'

// 注册的步骤
type RegisterStep = 'form' | 'verify'

export function AuthModal({ isOpen, onClose, mode, onAuthSuccess, onModeChange }: AuthModalProps) {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 忘记密码相关状态
  const [fpStep, setFpStep] = useState<ForgotPasswordStep>('email')
  const [verifyCode, setVerifyCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [fpSuccessMsg, setFpSuccessMsg] = useState('')

  // 注册相关状态
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form')
  const [registerVerifyCode, setRegisterVerifyCode] = useState('')
  const [registerCountdown, setRegisterCountdown] = useState(0)

  // ==================== 翻译 Supabase 错误消息 ====================
  const translateErrorMessage = (message: string): string => {
    const errorMap: Record<string, string> = {
      'New password should be different from the old password.': '新密码不能与原密码相同',
      'Invalid login credentials': '邮箱或密码错误',
      'Email not confirmed': '邮箱未验证',
      'User already registered': '该邮箱已注册',
      'Password should be at least 6 characters': '密码至少需要6个字符',
      'Unable to validate email address: invalid format': '邮箱格式不正确',
      'Signups not allowed': '暂不允许注册',
      'Email rate limit exceeded': '发送邮件过于频繁，请稍后再试',
      'User not found': '用户不存在',
    }

    for (const [english, chinese] of Object.entries(errorMap)) {
      if (message.includes(english)) {
        return chinese
      }
    }

    return message // 如果没有匹配到，返回原消息
  }

  // ==================== 模式切换时重置状态 ====================
  useEffect(() => {
    // 当模式切换时，重置所有步骤和错误
    setRegisterStep('form')
    setRegisterVerifyCode('')
    setRegisterCountdown(0)
    setFpStep('email')
    setVerifyCode('')
    setNewPassword('')
    setConfirmNewPassword('')
    setCountdown(0)
    setError('')
  }, [mode])

  // ==================== 密码强度验证 ====================
  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    // 检查长度
    if (password.length < 8) {
      return { valid: false, error: '密码至少需要8位字符' }
    }

    // 检查是否包含字母
    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, error: '密码必须包含字母' }
    }

    // 检查是否包含数字
    if (!/\d/.test(password)) {
      return { valid: false, error: '密码必须包含数字' }
    }

    // 防止常见弱密码
    const weakPasswords = ['12345678', 'password', 'qwerty123', 'abc12345', '11111111']
    if (weakPasswords.includes(password.toLowerCase())) {
      return { valid: false, error: '密码过于简单，请使用更强的密码' }
    }

    return { valid: true }
  }

  // ==================== 提交处理 ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 注册 - 第1步：发送验证码
      if (mode === 'register' && registerStep === 'form') {
        const validation = validatePassword(password)
        if (!validation.valid) {
          setError(validation.error || '密码格式不正确')
          setLoading(false)
          return
        }

        // 发送验证码
        const response = await fetch('/api/auth/send-verification-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type: 'email_verification' }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '发送失败')
        }

        // 开发环境显示验证码
        if (data.code) {
          toast.success(`📧 验证码：${data.code}`, {
            description: '（开发环境）请查收邮件或使用上方验证码',
            duration: 8000,
          })
        } else {
          toast.success('📧 验证码已发送到您的邮箱', {
            description: '请查收邮件获取验证码',
            duration: 5000,
          })
        }

        setRegisterStep('verify')

        // 开始倒计时（60秒）
        setRegisterCountdown(60)
        const timer = setInterval(() => {
          setRegisterCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        setLoading(false)
        return
      }

      // 注册 - 第2步：验证码验证并注册
      if (mode === 'register' && registerStep === 'verify') {
        if (!registerVerifyCode || registerVerifyCode.length !== 6) {
          setError('请输入6位验证码')
          setLoading(false)
          return
        }

        // 先验证验证码
        const verifyResponse = await fetch('/api/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: registerVerifyCode, type: 'email_verification' }),
        })

        const verifyData = await verifyResponse.json()

        if (!verifyResponse.ok) {
          throw new Error(verifyData.error || '验证码错误或已过期')
        }

        // 验证码正确，开始注册
        const { data, error } = await signUp(email, password)
        if (error) throw error

        toast.success('✅ 注册成功', {
          description: '账号绑定成功，已自动登录',
          duration: 3000,
        })

        onAuthSuccess()
        onClose()

        // 重置注册步骤
        setRegisterStep('form')
        setRegisterVerifyCode('')

        setLoading(false)
        return
      }

      // 登录
      if (mode === 'login') {
        const { error } = await signIn(email, password)
        if (error) throw error
        onAuthSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(translateErrorMessage(err.message) || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // ==================== 发送验证码 ====================
  const handleSendVerificationCode = async () => {
    if (!email) {
      setError('请输入邮箱地址')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '发送失败')
      }

      // 开发环境显示验证码
      if (data.code) {
        toast.success(`✅ 验证码：${data.code}`, {
          description: '（开发环境）请查收邮件或使用上方验证码',
          duration: 8000,
        })
      } else {
        toast.success('✅ 验证码已发送到您的邮箱', {
          description: '请查收邮件获取验证码',
          duration: 5000,
        })
      }

      setFpStep('verify')

      // 开始倒计时（60秒）
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(translateErrorMessage(err.message) || '发送失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // ==================== 验证验证码 ====================
  const handleVerifyCode = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verifyCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '验证失败')
      }

      // 验证成功，进入设置新密码步骤
      setFpStep('new-password')
      setError('')
    } catch (err: any) {
      setError(err.message || '验证码错误或已过期')
    } finally {
      setLoading(false)
    }
  }

  // ==================== 更新密码 ====================
  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      setError('请填写所有字段')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('两次输入的密码不一致')
      return
    }

    // 密码强度验证
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      setError(validation.error || '密码格式不正确')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast.success('✅ 密码修改成功，请使用新密码登录')
      onModeChange('login')
      setFpStep('email')
      setEmail('')
      setVerifyCode('')
      setNewPassword('')
      setConfirmNewPassword('')
      setError('')
    } catch (err: any) {
      setError(translateErrorMessage(err.message) || '修改失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Modal - 从下往上滑进来 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-50 p-6 pb-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] max-h-[calc(100vh-2rem)] overflow-y-auto relative"
          >
            {/* 标题栏 - 带关闭按钮（忘记密码模式不显示关闭按钮） */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif text-foreground">
                {mode === 'register' ? '📧 绑定邮箱账号' :
                 mode === 'forgot-password' ? '🔑 忘记密码' :
                 '🔐 登录'}
              </h2>
              {mode !== 'forgot-password' && (
                <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {mode === 'forgot-password' ? (
              // ==================== 忘记密码 - 3步流程 ====================
              <div className="space-y-4">
                {/* 步骤1：输入邮箱 */}
                {fpStep === 'email' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        邮箱地址
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                          required
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSendVerificationCode}
                      disabled={loading}
                      className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {loading ? '发送中...' : '发送验证码'}
                    </button>
                  </>
                )}

                {/* 步骤2：输入验证码 */}
                {fpStep === 'verify' && (
                  <>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
                      <p className="text-sm text-blue-700">验证码已发送到：</p>
                      <p className="text-sm text-blue-900 font-medium break-all">{email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                        className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary text-center text-2xl tracking-widest"
                        required
                      />
                    </div>

                    <button
                      onClick={handleVerifyCode}
                      disabled={loading || verifyCode.length !== 6}
                      className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {loading ? '验证中...' : '下一步'}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={countdown > 0}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        验证成功，请设置新密码
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                          required
                        />
                      </div>
                    </div>

                    {/* 密码强度提示 */}
                    {newPassword && (
                      <div className="text-xs text-muted-foreground space-y-1 bg-secondary rounded-lg p-3">
                        <p className="font-medium">密码要求：</p>
                        <ul className="pl-4 space-y-1">
                          <li className={newPassword.length >= 8 ? 'text-green-600' : 'text-red-600'}>
                            {newPassword.length >= 8 ? '✓' : '✗'} 至少8位字符
                          </li>
                          <li className={/[a-zA-Z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}>
                            {/[a-zA-Z]/.test(newPassword) ? '✓' : '✗'} 包含字母
                          </li>
                          <li className={/\d/.test(newPassword) ? 'text-green-600' : 'text-red-600'}>
                            {/\d/.test(newPassword) ? '✓' : '✗'} 包含数字
                          </li>
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={handleUpdatePassword}
                      disabled={loading}
                      className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {loading ? '修改中...' : '确认修改'}
                    </button>
                  </>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
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
                      <label className="block text-sm font-medium text-foreground mb-2">
                        邮箱地址
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                          required
                        />
                      </div>
                    </div>

                    {/* 密码输入 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                          required
                        />
                      </div>
                    </div>

                    {/* 密码强度提示 */}
                    {password && (
                      <div className="text-xs text-muted-foreground space-y-1 bg-secondary rounded-lg p-3">
                        <p className="font-medium">密码要求：</p>
                        <ul className="pl-4 space-y-1">
                          <li className={password.length >= 8 ? 'text-green-600' : 'text-red-600'}>
                            {password.length >= 8 ? '✓' : '✗'} 至少8位字符
                          </li>
                          <li className={/[a-zA-Z]/.test(password) ? 'text-green-600' : 'text-red-600'}>
                            {/[a-zA-Z]/.test(password) ? '✓' : '✗'} 包含字母
                          </li>
                          <li className={/\d/.test(password) ? 'text-green-600' : 'text-red-600'}>
                            {/\d/.test(password) ? '✓' : '✗'} 包含数字
                          </li>
                        </ul>
                      </div>
                    )}

                    {/* 错误提示 */}
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    {/* 按钮 */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {loading ? '发送中...' : '发送验证码'}
                      </button>
                    </div>

                    {/* 提示文本 */}
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      绑定后可开启云同步，数据永不丢失
                    </p>
                    <p className="text-[10px] text-muted-foreground text-center mt-2 leading-relaxed">
                      🔒 注册即表示您同意我们仅为提供数据同步服务而存储您的加密数据。
                    </p>
                  </>
                )}

                {/* 注册模式 - 第2步：输入验证码 */}
                {mode === 'register' && registerStep === 'verify' && (
                  <>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
                      <p className="text-sm text-blue-700">验证码已发送到：</p>
                      <p className="text-sm text-blue-900 font-medium break-all">{email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                        className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary text-center text-2xl tracking-widest"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || registerVerifyCode.length !== 6}
                      className="w-full px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {loading ? '验证中...' : '确认并注册'}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={async () => {
                          setLoading(true)
                          try {
                            const response = await fetch('/api/auth/send-verification-code', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email, type: 'email_verification' }),
                            })

                            const data = await response.json()

                            if (!response.ok) {
                              throw new Error(data.error || '发送失败')
                            }

                            if (data.code) {
                              toast.success(`📧 验证码：${data.code}`, {
                                description: '（开发环境）请查收邮件或使用上方验证码',
                                duration: 8000,
                              })
                            } else {
                              toast.success('📧 验证码已重新发送', {
                                description: '请查收邮件获取验证码',
                                duration: 5000,
                              })
                            }

                            // 重置倒计时
                            setRegisterCountdown(60)
                            const timer = setInterval(() => {
                              setRegisterCountdown((prev) => {
                                if (prev <= 1) {
                                  clearInterval(timer)
                                  return 0
                                }
                                return prev - 1
                              })
                            }, 1000)
                          } catch (err: any) {
                            setError(err.message || '发送失败，请重试')
                          } finally {
                            setLoading(false)
                          }
                        }}
                        disabled={registerCountdown > 0}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {registerCountdown > 0 ? `重新发送(${registerCountdown}s)` : '重新发送验证码'}
                      </button>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
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
                      <label className="block text-sm font-medium text-foreground mb-2">
                        邮箱地址
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
                          required
                        />
                      </div>
                    </div>

                    {/* 密码输入 */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-transparent bg-secondary"
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
                          className="text-xs text-primary hover:underline"
                        >
                          忘记密码？
                        </button>
                      </div>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    {/* 按钮 */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 transition-all"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-3 green-gradient backdrop-blur-md text-white rounded-xl border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        {loading ? '登录中...' : '登录'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {/* 忘记密码：返回登录按钮（放在关闭按钮位置） */}
            {mode === 'forgot-password' && fpStep === 'email' && (
              <button
                type="button"
                onClick={() => {
                  onModeChange('login')
                  setFpStep('email')
                  setError('')
                }}
                className="absolute left-6 top-6 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-sm flex items-center gap-1">
                  ← 返回登录
                </span>
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
