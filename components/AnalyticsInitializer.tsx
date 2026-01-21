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
  }, [])

  return null
}
