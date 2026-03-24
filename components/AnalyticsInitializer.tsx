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
    let stats = {
      total_records: 0,
      completed_practice: 0,
      patched_practice: 0,
      records_with_notes: 0,
      records_with_breakthrough: 0,
      notes_rate: 0
    }

    try {
      const recordsData = localStorage.getItem('ashtanga_records')
      if (recordsData) {
        const records = JSON.parse(recordsData)
        // ⭐ 确保 records 是数组
        if (Array.isArray(records)) {
          const totalRecords = records.length
          const completedPractice = records.filter((r: any) =>
            r.created_at && r.date && new Date(r.created_at).toDateString() === new Date(r.date).toDateString()
          ).length
          const patchedPractice = totalRecords - completedPractice
          const recordsWithNotes = records.filter((r: any) =>
            r.notes && r.notes.trim().length > 0
          ).length
          const recordsWithBreakthrough = records.filter((r: any) =>
            r.breakthrough && r.breakthrough.trim().length > 0
          ).length

          stats = {
            total_records: totalRecords,
            completed_practice: completedPractice,
            patched_practice: patchedPractice,
            records_with_notes: recordsWithNotes,
            records_with_breakthrough: recordsWithBreakthrough,
            notes_rate: totalRecords > 0 ? Math.round((recordsWithNotes / totalRecords) * 100) : 0
          }
        }
      }
    } catch (error) {
      console.error('Failed to collect user stats:', error)
    }

    // ⭐ 无论是否有记录，都发送 user_stats 事件
    trackEvent('user_stats', stats)
  }, [])

  return null
}
