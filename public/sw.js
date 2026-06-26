const CACHE_NAME = 'ashtanga-static'
const STATIC_ASSETS = [
  '/icon.png',
  '/apple-icon.png',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await clients.claim()

      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('ashtanga-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    event.respondWith(fetch(request))
    return
  }

  // 页面 HTML 必须始终走网络，避免 PWA 启动时拿到旧 HTML 后引用过期的 Next.js chunk。
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(fetch(request))
    return
  }

  // API 和音频都不进缓存：API 要实时，音频要保留 Range 流式播放能力。
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/audio/')) {
    event.respondWith(fetch(request))
    return
  }

  // 只对图标、manifest 这类稳定静态资源使用 cache-first。
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache))
          }
          return response
        })
      })
    )
  }
})
