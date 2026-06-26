'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface MembershipStatus {
  is_active: boolean
  expires_at: string | null
  expires_at_formatted: string | null
  days_remaining: number
  type: 'quarter' | 'year' | 'trial' | null
}

export const PRO_BENEFITS = [
  { feature: '每条记录照片', free: '1 张', pro: '9 张' },
  { feature: '单张照片大小', free: '5 MB', pro: '30 MB' },
  { feature: '练习选项', free: '3 个', pro: '11 个' },
  { feature: '日历标注', free: '1 种', pro: '9 种' },
  { feature: '日历颜色', free: '2 种', pro: '4 种' },
  { feature: '唱诵倒计时', free: '1 分钟', pro: '自定义' },
] as const

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

      const result = await response.json()

      if (response.ok) {
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
        fetchMembershipStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchMembershipStatus])

  const refresh = useCallback(async () => {
    await fetchMembershipStatus()
  }, [fetchMembershipStatus])

  return {
    membership,
    loading,
    error,
    isPro: membership?.is_active ?? false,
    refresh,
  }
}
