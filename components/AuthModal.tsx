"use client"

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [registeringCountdown, setRegisteringCountdown] = useState(0) // 注册倒计时

  // ==================== 翻译 Supabase 错误消息 ====================
  const translateErrorMessage = (message: string | undefined): string => {
    // 如果 message 是 undefined 或空，返回默认错误
    if (!message) {
      return '操作失败，请重试'
    }

    const errorMap: Record<string, string> = {
      'New password should be different from the old password.': '新密码不能与原密码相同',
      'Invalid login credentials': '邮箱或密码错误',
      'Email not confirmed': '邮箱未验证',
      'User already registered': '该邮箱已注册，请直接登录',
      'Password should be at least 6 characters': '密码至少需要6个字符',
      'Unable to validate email address: invalid format': '邮箱格式不正确',
      'Signups not allowed': '暂不允许注册',
      'Email rate limit exceeded': '发送邮件过于频繁，请稍后再试',
      'User not found': '用户不存在',
      'AuthRetryableFetchError': '网络请求失败，请检查网络连接后重试',
      'Failed to fetch': '网络连接失败，请检查网络或尝试刷新页面',
      'Gateway Timeout': '服务器响应超时，可能正在发送确认邮件，请稍后尝试登录',
      '504': '服务器响应超时，可能正在发送确认邮件，请稍后尝试登录',
      '注册请求超时': '注册请求超时，可能正在发送确认邮件，请稍后尝试登录',
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

        toast.success('📧 验证码已发送到您的邮箱', {
          description: '请查收邮件获取验证码',
          duration: 5000,
        })

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

        // 验证码正确，开始注册（服务端会再次验证验证码）
        console.log('✅ 验证码验证成功，开始注册...')
        toast.info('⏳ 正在注册账号，请稍候...', {
          description: '首次注册可能需要 10-30 秒',
          duration: 5000,
        })

        // 启动注册倒计时（60秒）
        setRegisteringCountdown(60)
        const timer = setInterval(() => {
          setRegisteringCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        try {
          // 调用服务端注册 API（服务端会验证验证码和密码强度）
          const registerResponse = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              verificationCode: registerVerifyCode,
            }),
          })

          const registerData = await registerResponse.json()

          if (!registerResponse.ok) {
            throw new Error(registerData.error || '注册失败')
          }

          console.log('✅ 注册成功:', registerData)
          console.log('📧 注册返回的用户数据:', registerData.data?.user)
          console.log('📧 注册返回的session:', registerData.data?.session)

          // 注册成功，停止倒计时
          clearInterval(timer)
          setRegisteringCountdown(0)

          // ⭐ 服务端注册成功后，前端需要手动登录
          // 因为服务端的 Supabase 客户端和前端的是不同的实例
          console.log('🔄 开始自动登录...')
          toast.info('🔄 正在自动登录...', {
            duration: 2000,
          })

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          console.log('📧 自动登录结果:', { signInData, signInError })

          if (signInError) {
            console.error('❌ 自动登录失败:', signInError)
            toast.warning('✅ 注册成功，请手动登录', {
              description: '账号已创建，请点击登录按钮',
              duration: 5000,
            })
          } else {
            console.log('✅ 自动登录成功:', signInData.user?.email)
            toast.success('✅ 绑定成功，已自动登录', {
              description: '🎉 已赠送31天Pro会员',
              duration: 3000,
            })
          }

          onAuthSuccess()
          onClose()

          // 重置注册步骤
          setRegisterStep('form')
          setRegisterVerifyCode('')
        } catch (err: any) {
          clearInterval(timer)
          setRegisteringCountdown(0)
          throw err
        }

        setLoading(false)
        return
      }

      // 登录
      if (mode === 'login') {
        const { error } = await signIn(email, password) as any
        if (error) throw error
        onAuthSuccess()
        onClose()
      }
    } catch (err: any) {
      // 清理注册倒计时
      setRegisteringCountdown(0)
      setError(translateErrorMessage(err.message) || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // ==================== 发送验证码 ====================
  const handleSendVerificationCode = async () => {
    const startTime = Date.now()
    console.log('📧 忘记密码流程 - 发送验证码')
    console.log('   目标邮箱:', email)

    if (!email) {
      console.log('   ❌ 错误：邮箱地址为空')
      setError('请输入邮箱地址')
      return
    }

    setLoading(true)
    console.log('   步骤1: 调用 /api/auth/send-verification-code...')

    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const elapsed = Date.now() - startTime
      console.log(`   步骤2: API 响应收到（耗时: ${elapsed/1000}秒）`)
      console.log('   HTTP 状态码:', response.status)

      const data = await response.json()
      console.log('   响应数据:', data)

      if (!response.ok) {
        console.log('   ❌ API 返回错误:', data.error)
        throw new Error(data.error || '发送失败')
      }

      console.log('   ✅ 验证码发送成功')

      toast.success('✅ 验证码已发送到您的邮箱', {
        description: '请查收邮件获取验证码',
        duration: 5000,
      })

      console.log('   步骤3: 切换到验证码输入步骤')
      setFpStep('verify')

      // 开始倒计时（60秒）
      console.log('   步骤4: 开始60秒倒计时')
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
      const elapsed = Date.now() - startTime
      console.error(`   ❌ 发送验证码异常（${elapsed/1000}秒）:`, err)
      console.error('   错误信息:', err.message)
      const translatedError = translateErrorMessage(err.message)
      console.log('   翻译后的错误:', translatedError)
      setError(translatedError || '发送失败，请重试')
    } finally {
      console.log('   步骤5: 结束发送验证码流程，重置loading状态')
      setLoading(false)
    }
  }

  // ==================== 验证验证码 ====================
  const handleVerifyCode = async () => {
    const startTime = Date.now()
    console.log('🔍 忘记密码流程 - 验证验证码')
    console.log('   目标邮箱:', email)
    console.log('   输入的验证码:', verifyCode)

    if (!verifyCode || verifyCode.length !== 6) {
      console.log('   ❌ 验证失败：验证码格式错误（需要6位）')
      setError('请输入6位验证码')
      return
    }

    setLoading(true)
    console.log('   步骤1: 调用 /api/auth/verify-code...')

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verifyCode, type: 'reset_password' }),
      })

      const elapsed = Date.now() - startTime
      console.log(`   步骤2: API 响应收到（耗时: ${elapsed/1000}秒）`)
      console.log('   HTTP 状态码:', response.status)

      const data = await response.json()
      console.log('   响应数据:', data)

      if (!response.ok) {
        console.log('   ❌ API 返回错误:', data.error)
        throw new Error(data.error || '验证失败')
      }

      console.log('   ✅ 验证码验证通过')
      console.log('   步骤3: 切换到设置新密码步骤')

      // 验证成功，进入设置新密码步骤
      setFpStep('new-password')
      setError('')
    } catch (err: any) {
      const elapsed = Date.now() - startTime
      console.error(`   ❌ 验证码验证异常（${elapsed/1000}秒）:`, err)
      console.error('   错误信息:', err.message)
      setError(err.message || '验证码错误或已过期')
    } finally {
      console.log('   步骤4: 结束验证码验证流程，重置loading状态')
      setLoading(false)
    }
  }

  // ==================== 更新密码 ====================
  const handleUpdatePassword = async () => {
    const startTime = Date.now()
    console.log('🔑 忘记密码流程 - 开始更新密码')
    console.log('   步骤1: 验证输入...')

    if (!newPassword || !confirmNewPassword) {
      console.log('   ❌ 验证失败：未填写所有字段')
      setError('请填写所有字段')
      return
    }

    if (newPassword !== confirmNewPassword) {
      console.log('   ❌ 验证失败：两次输入的密码不一致')
      setError('两次输入的密码不一致')
      return
    }

    // 密码强度验证
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      console.log('   ❌ 验证失败：密码格式不正确 -', validation.error)
      setError(validation.error || '密码格式不正确')
      return
    }

    console.log('   ✅ 输入验证通过')

    setLoading(true)
    console.log('   步骤2: 调用后端 API 更新密码...')

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          newPassword
        }),
      })

      const elapsed = Date.now() - startTime
      console.log(`   步骤3: API 响应收到（耗时: ${elapsed/1000}秒）`)
      console.log('   HTTP 状态码:', response.status)

      const data = await response.json()
      console.log('   响应数据:', data)

      if (!response.ok) {
        console.log('   ❌ API 返回错误:', data.error)
        throw new Error(data.error || '更新失败')
      }

      console.log('   ✅ 密码更新成功！')
      console.log('   步骤4: 切换到登录页面...')
      toast.success('✅ 密码重置成功，请使用新密码登录')
      onModeChange('login')
      setFpStep('email')
      setEmail('')
      setVerifyCode('')
      setNewPassword('')
      setConfirmNewPassword('')
      setError('')
    } catch (err: any) {
      const elapsed = Date.now() - startTime
      console.error(`   ❌ 更新密码异常（${elapsed/1000}秒）:`, err)
      console.error('   错误信息:', err.message)
      const translatedError = translateErrorMessage(err.message)
      console.log('   翻译后的错误:', translatedError)
      setError(translatedError || '修改失败，请重试')
    } finally {
      console.log('   步骤5: 结束更新密码流程，重置loading状态')
      setLoading(false)
    }
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
                <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
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

                            toast.success('📧 验证码已重新发送', {
                              description: '请查收邮件获取验证码',
                              duration: 5000,
                            })

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
                            console.log('🔑 用户点击"忘记密码？"链接')
                            console.log('   当前登录邮箱:', email)
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
