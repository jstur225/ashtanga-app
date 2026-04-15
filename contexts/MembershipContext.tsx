'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

export interface MembershipStatus {
  is_active: boolean
  expires_at: string | null
  expires_at_formatted: string | null
  days_remaining: number
  type: 'quarter' | 'year' | null
}

interface MembershipContextType {
  membership: MembershipStatus | null
  setMembership: (data: MembershipStatus | null) => void
  refreshMembership: () => Promise<void>
  isLoading: boolean
}

const MembershipContext = createContext<MembershipContextType | null>(null)

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [membership, setMembership] = useState<MembershipStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refreshMembership = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession())
      const token = session?.access_token

      if (!token) {
        setMembership(null)
        return
      }

      const response = await fetch('/api/membership/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      const result = await response.json()
      if (result.success) {
        setMembership(result.data)
      }
    } catch (err) {
      console.error('获取会员状态失败:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <MembershipContext.Provider value={{
      membership,
      setMembership,
      refreshMembership,
      isLoading,
    }}>
      {children}
    </MembershipContext.Provider>
  )
}

export function useMembershipContext() {
  const context = useContext(MembershipContext)
  if (!context) {
    throw new Error('useMembershipContext 必须在 MembershipProvider 内使用')
  }
  return context
}
