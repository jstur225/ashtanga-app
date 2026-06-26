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
  { icon: 'image', text: '9 张', subtext: '每条记录' },
  { icon: 'upload', text: '30MB', subtext: '单张照片' },
  { icon: 'sliders', text: '11 个', subtext: '练习选项' },
  { icon: 'calendar', text: '9 种', subtext: '日历标注' },
  { icon: 'palette', text: '全部', subtext: '日历颜色' },
  { icon: 'timer', text: '自定义', subtext: '唱诵时长' },
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
