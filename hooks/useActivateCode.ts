'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface ActivateResponse {
  success: boolean
  data?: {
    expires_at: string
    expires_at_formatted: string
    days: number
    type: 'quarter' | 'year'
    is_new: boolean
  }
  error?: string
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: '激活码无效',
  INVALID_CODE_FORMAT: '激活码格式错误',
  CODE_USED: '该激活码已被使用',
  CODE_EXPIRED: '该激活码已过期',
  NOT_AUTHENTICATED: '请先登录',
  DATABASE_ERROR: '系统繁忙，请稍后再试',
  INTERNAL_ERROR: '服务器错误',
}

export function formatActivateCode(input: string) {
  const clean = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12)
  const parts = []
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4))
  }
  return parts.join('-')
}

export function useActivateCode(onSuccess?: () => void) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<ActivateResponse['data'] | null>(null)

  const isCodeComplete = code.replace(/-/g, '').length === 12

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(formatActivateCode(e.target.value))
    setError(null)
  }

  const handleActivate = useCallback(async () => {
    if (code.replace(/-/g, '').length !== 12) {
      setError('请输入完整的激活码')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setError('请先登录')
        setLoading(false)
        return
      }

      const response = await fetch('/api/membership/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      })

      const result: ActivateResponse = await response.json()

      if (!result.success) {
        setError(ERROR_MESSAGES[result.error || ''] || result.error || '激活失败，请重试')
      } else {
        setSuccess(result.data || null)
        await onSuccess?.()
      }
    } catch {
      setError('网络错误，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }, [code, onSuccess])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleActivate()
    }
  }

  const reset = useCallback(async () => {
    const wasSuccess = success !== null
    setCode('')
    setError(null)
    setSuccess(null)
    if (wasSuccess) {
      await onSuccess?.()
    }
    return wasSuccess
  }, [success, onSuccess])

  return {
    code,
    loading,
    error,
    success,
    isCodeComplete,
    handleInputChange,
    handleActivate,
    handleKeyDown,
    reset,
  }
}
