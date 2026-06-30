'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    __ashtangaRuntimeReady?: () => void
    __ashtangaRuntimeDiagnostic?: (type: string, details?: Record<string, unknown>) => void
  }
}

export function RuntimeDiagnosticsReady() {
  useEffect(() => {
    window.__ashtangaRuntimeReady?.()
  }, [])

  return null
}
