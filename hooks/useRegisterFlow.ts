"use client"

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  postAuthJson,
  sendAuthVerificationCode,
  translateAuthError,
  validateAuthPassword,
  type RegisterStep,
} from '@/lib/auth-modal-utils'
import { useCountdownTimer } from '@/hooks/useCountdownTimer'

interface RegisterFlowArgs {
  email: string
  password: string
  setError: (error: string) => void
  setLoading: (loading: boolean) => void
  onAuthSuccess: () => void
  onClose: () => void
}

export function useRegisterFlow() {
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form')
  const [registerVerifyCode, setRegisterVerifyCode] = useState('')
  const {
    countdown: registerCountdown,
    start: startRegisterCountdown,
    stop: stopRegisterCountdown,
  } = useCountdownTimer()
  const {
    countdown: registeringCountdown,
    start: startRegisteringCountdown,
    stop: stopRegisteringCountdown,
  } = useCountdownTimer()

  const resetRegisterFlow = useCallback(() => {
    setRegisterStep('form')
    setRegisterVerifyCode('')
    stopRegisterCountdown()
    stopRegisteringCountdown()
  }, [stopRegisterCountdown, stopRegisteringCountdown])

  const sendRegisterCode = useCallback(async (email: string) => {
    await sendAuthVerificationCode(email, 'email_verification')
    toast.success('📧 验证码已发送到您的邮箱', {
      description: '请查收邮件获取验证码',
      duration: 5000,
    })
    setRegisterStep('verify')
    startRegisterCountdown(60)
  }, [startRegisterCountdown])

  const resendRegisterCode = useCallback(async ({ email, setError, setLoading }: Pick<RegisterFlowArgs, 'email' | 'setError' | 'setLoading'>) => {
    setLoading(true)
    try {
      await sendRegisterCode(email)
    } catch (err: any) {
      setError(translateAuthError(err.message) || '发送失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [sendRegisterCode])

  const submitRegister = useCallback(async ({
    email,
    password,
    setError,
    setLoading,
    onAuthSuccess,
    onClose,
  }: RegisterFlowArgs) => {
    setError('')
    setLoading(true)

    try {
      if (registerStep === 'form') {
        const validation = validateAuthPassword(password)
        if (!validation.valid) {
          setError(validation.error || '密码格式不正确')
          return
        }
        await sendRegisterCode(email)
        return
      }

      if (!registerVerifyCode || registerVerifyCode.length !== 6) {
        setError('请输入6位验证码')
        return
      }

      toast.info('⏳ 正在注册账号，请稍候...', {
        description: '首次注册可能需要 10-30 秒',
        duration: 5000,
      })

      startRegisteringCountdown(60)

      await postAuthJson('/api/auth/register', {
        email,
        password,
        verificationCode: registerVerifyCode,
      })

      stopRegisteringCountdown()

      toast.info('🔄 正在自动登录...', { duration: 2000 })

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        toast.warning('✅ 注册成功，请手动登录', {
          description: '账号已创建，请点击登录按钮',
          duration: 5000,
        })
      } else {
        toast.success('✅ 绑定成功，已自动登录', {
          description: '🎉 已赠送31天Pro会员',
          duration: 3000,
        })
      }

      onAuthSuccess()
      onClose()
      resetRegisterFlow()
    } catch (err: any) {
      stopRegisteringCountdown()
      setError(translateAuthError(err.message) || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }, [registerStep, registerVerifyCode, resetRegisterFlow, sendRegisterCode, startRegisteringCountdown, stopRegisteringCountdown])

  return {
    registerStep,
    setRegisterStep,
    registerVerifyCode,
    setRegisterVerifyCode,
    registerCountdown,
    registeringCountdown,
    resetRegisterFlow,
    resendRegisterCode,
    submitRegister,
  }
}
