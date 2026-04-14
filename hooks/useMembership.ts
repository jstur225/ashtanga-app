'use client'

import { useState, useEffect, useCallback } from 'react'

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
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      setLoading(false)
      setMembership(null)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/membership/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
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
