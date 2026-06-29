'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('Service Worker 注册成功:', registration.scope)
          window.__ashtangaRuntimeDiagnostic?.('service_worker_registered', {
            scope: registration.scope,
            activeScript: registration.active?.scriptURL || null,
            waitingScript: registration.waiting?.scriptURL || null,
          })
          void registration.update()
        })
        .catch((error) => {
          console.log('Service Worker 注册失败:', error)
          window.__ashtangaRuntimeDiagnostic?.('service_worker_registration_failed', {
            message: error instanceof Error ? error.message : String(error),
          })
        })
    }
  }, [])

  return null
}
