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
  { text: '9 张', subtext: '照片上传' },
  { text: '11 个', subtext: '自定义选项' },
  { text: '自定义', subtext: '日历标注（期待上线）' },
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

      console.log('[useMembership] Session:', session ? 'exists' : 'null')
      console.log('[useMembership] Token:', token ? `exists (${token.slice(0, 20)}...)` : 'null')

      if (!token) {
        console.log('[useMembership] No token, skipping fetch')
        setLoading(false)
        setMembership(null)
        return
      }

      setLoading(true)
      console.log('[useMembership] Sending request with Authorization header')
      const response = await fetch('/api/membership/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      console.log('[useMembership] Response status:', response.status)
      const result = await response.json()
      console.log('[useMembership] API 返回完整数据:', JSON.stringify(result, null, 2))

      // ⭐ 打印调试信息（用 error 级别确保显示）
      if (result._debug) {
        console.error('[useMembership] ========== 调试信息 ==========')
        console.error('[useMembership] userId:', result._debug.userId)
        console.error('[useMembership] profileId:', result._debug.profileId)
        console.error('[useMembership] queryId:', result._debug.queryId)
        console.error('[useMembership] hasMembershipData:', result._debug.hasMembershipData)
        console.error('[useMembership] rawMembership:', JSON.stringify(result._debug.rawMembership, null, 2))
        console.error('[useMembership] =================================')
      }

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
        console.log('[useMembership] 页面可见，刷新会员状态')
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
