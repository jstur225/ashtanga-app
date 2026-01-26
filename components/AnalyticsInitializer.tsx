'use client'

import { useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { initAnalytics, identifyUser, trackEvent } from '@/lib/analytics'

export function AnalyticsInitializer() {
  useEffect(() => {
    // 1. Init Mixpanel
    initAnalytics()

    // 2. Handle UUID
    let uuid = localStorage.getItem('ashtanga_uuid')
    if (!uuid) {
      uuid = uuidv4()
      localStorage.setItem('ashtanga_uuid', uuid)
    }

    // 3. Identify and track app open
    identifyUser(uuid)
    trackEvent('app_open', { uuid })

    // 4. Collect user statistics
    try {
      const recordsData = localStorage.getItem('ashtanga_records')
      if (recordsData) {
        const records = JSON.parse(recordsData)

        // 统计数据
        const totalRecords = records.length
        const completedPractice = records.filter((r: any) =>
          r.created_at && r.date && new Date(r.created_at).toDateString() === new Date(r.date).toDateString()
        ).length
        const patchedPractice = totalRecords - completedPractice

        trackEvent('user_stats', {
          total_records: totalRecords,
          completed_practice: completedPractice,
          patched_practice: patchedPractice
        })
      }
    } catch (error) {
      console.error('Failed to collect user stats:', error)
    }
  }, [])

  return null
}
