'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface MembershipStatus {
  is_active: boolean
  expires_at: string | null
  expires_at_formatted: string | null
  days_remaining: number
  type: 'quarter' | 'year' | null
}

export function useMembership() {
  const [membership, setMembership] = useState<MembershipStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembershipStatus = useCallback(async () => {
    try {
      // 从 Supabase 获取当前 session
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        setLoading(false)
        setMembership(null)
        return
      }

      setLoading(true)
      const response = await fetch('/api/membership/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[useMembership] API 返回:', result)
        if (result.success) {
          setMembership(result.data)
          setError(null)
        } else {
          setError(result.error || '获取会员状态失败')
        }
      } else {
        setError(`HTTP ${response.status}`)
      }
    } catch (err) {
      console.error('获取会员状态失败:', err)
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembershipStatus()
  }, [fetchMembershipStatus])

  // ⭐ 监听页面可见性变化，当用户从其他页面返回时刷新会员状态
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useMembership] 页面可见，刷新会员状态')
        fetchMembershipStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchMembershipStatus])

  const refresh = useCallback(() => {
    fetchMembershipStatus()
  }, [fetchMembershipStatus])

  return {
    membership,
    loading,
    error,
    isPro: membership?.is_active ?? false,
    refresh,
  }
}
