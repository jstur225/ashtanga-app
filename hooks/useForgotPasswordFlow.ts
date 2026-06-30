"use client"

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  postAuthJson,
  sendAuthVerificationCode,
  translateAuthError,
  validateAuthPassword,
  type ForgotPasswordStep,
} from '@/lib/auth-modal-utils'
import { useCountdownTimer } from '@/hooks/useCountdownTimer'

interface ForgotPasswordFlowArgs {
  email: string
  setEmail: (email: string) => void
  setError: (error: string) => void
  setLoading: (loading: boolean) => void
  onModeChange: (mode: 'login' | 'register' | 'forgot-password') => void
}

export function useForgotPasswordFlow() {
  const [fpStep, setFpStep] = useState<ForgotPasswordStep>('email')
  const [verifyCode, setVerifyCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const {
    countdown,
    start: startResendCountdown,
    stop: stopResendCountdown,
  } = useCountdownTimer()

  const resetForgotPasswordFlow = useCallback(() => {
    setFpStep('email')
    setVerifyCode('')
    setNewPassword('')
    setConfirmNewPassword('')
    stopResendCountdown()
  }, [stopResendCountdown])

  const sendVerificationCode = useCallback(async ({ email, setError, setLoading }: Pick<ForgotPasswordFlowArgs, 'email' | 'setError' | 'setLoading'>) => {
    if (!email) {
      setError('请输入邮箱地址')
      return
    }

    setLoading(true)
    try {
      await sendAuthVerificationCode(email)
      toast.success('✅ 验证码已发送到您的邮箱', {
        description: '请查收邮件获取验证码',
        duration: 5000,
      })
      setFpStep('verify')
      startResendCountdown(60)
    } catch (err: any) {
      setError(translateAuthError(err.message) || '发送失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [startResendCountdown])

  const verifyResetCode = useCallback(async ({ email, setError, setLoading }: Pick<ForgotPasswordFlowArgs, 'email' | 'setError' | 'setLoading'>) => {
    if (!verifyCode || verifyCode.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    setLoading(true)
    try {
      await postAuthJson('/api/auth/verify-code', {
        email,
        code: verifyCode,
        type: 'reset_password',
      })
      setFpStep('new-password')
      setError('')
    } catch (err: any) {
      setError(translateAuthError(err.message) || '验证码错误或已过期')
    } finally {
      setLoading(false)
    }
  }, [verifyCode])

  const updatePassword = useCallback(async ({
    email,
    setEmail,
    setError,
    setLoading,
    onModeChange,
  }: ForgotPasswordFlowArgs) => {
    if (!newPassword || !confirmNewPassword) {
      setError('请填写所有字段')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('两次输入的密码不一致')
      return
    }

    const validation = validateAuthPassword(newPassword)
    if (!validation.valid) {
      setError(validation.error || '密码格式不正确')
      return
    }

    setLoading(true)
    try {
      await postAuthJson('/api/auth/reset-password', {
        email,
        newPassword,
        code: verifyCode,
      })

      toast.success('✅ 密码重置成功，请使用新密码登录')
      onModeChange('login')
      setEmail('')
      resetForgotPasswordFlow()
      setError('')
    } catch (err: any) {
      setError(translateAuthError(err.message) || '修改失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [confirmNewPassword, newPassword, resetForgotPasswordFlow, verifyCode])

  return {
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
  }
}
