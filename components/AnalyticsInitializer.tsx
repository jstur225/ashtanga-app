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

        // 觉察记录统计（有 notes 或 breakthrough 的记录）
        const recordsWithNotes = records.filter((r: any) =>
          r.notes && r.notes.trim().length > 0
        ).length
        const recordsWithBreakthrough = records.filter((r: any) =>
          r.breakthrough && r.breakthrough.trim().length > 0
        ).length

        trackEvent('user_stats', {
          total_records: totalRecords,
          completed_practice: completedPractice,
          patched_practice: patchedPractice,
          records_with_notes: recordsWithNotes,
          records_with_breakthrough: recordsWithBreakthrough,
          notes_rate: totalRecords > 0 ? Math.round((recordsWithNotes / totalRecords) * 100) : 0
        })
      }
    } catch (error) {
      console.error('Failed to collect user stats:', error)
    }
  }, [])

  return null
}
