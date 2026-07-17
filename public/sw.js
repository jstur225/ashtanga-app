const STATIC_CACHE_NAME = 'ashtanga-static-v2'
const PAGE_CACHE_NAME = 'ashtanga-pages-v1'
const NAVIGATION_TIMEOUT_MS = 4000
const SERVICE_WORKER_VERSION = 'pwa-resilience-v1'
const reportedStaticCacheHits = new Set()
const STATIC_ASSETS = [
  '/icon.png',
  '/apple-icon.png',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))
    )
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await clients.claim()

      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName.startsWith('ashtanga-') &&
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== PAGE_CACHE_NAME
          )
          .map((cacheName) => caches.delete(cacheName))
      )

      const controlledClients = await clients.matchAll({ type: 'window' })
      controlledClients.forEach((client) => {
        client.postMessage({
          source: 'ashtanga-service-worker',
          type: 'service_worker_activated',
          details: {
            version: SERVICE_WORKER_VERSION,
            staticCache: STATIC_CACHE_NAME,
            pageCache: PAGE_CACHE_NAME,
          },
        })
      })
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 跨域 OSS 资源直接交给浏览器，避免 Service Worker 参与图片 PUT 请求体转发。
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.method !== 'GET') {
    return
  }

  // 页面优先走网络。Wi-Fi/CDN 卡住时，4 秒后自动回退到最后一次成功页面。
  // 页面引用的内容哈希 chunk 会一同保留，因此回退页面与脚本版本保持一致。
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstNavigation(request, event.clientId))
    return
  }

  // API 和音频都不进缓存：API 要实时，音频要保留 Range 流式播放能力。
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/audio/')) {
    event.respondWith(fetch(request))
    return
  }

  // Next.js 的带哈希脚本和字体是不可变资源，缓存后可避免弱网重复下载或 chunk 加载失败。
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          reportStaticCacheHit(event.clientId, url.pathname)
          return cached
        }

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, responseToCache))
          }
          return response
        }).catch((error) => {
          notifyClient(event.clientId, 'next_static_network_failed', {
            path: url.pathname,
            message: error instanceof Error ? error.message : String(error),
          })
          throw error
        })
      })
    )
  }
})

async function networkFirstNavigation(request, clientId) {
  const startedAt = Date.now()
  const cache = await caches.open(PAGE_CACHE_NAME)
  const cached = await cache.match(request, { ignoreSearch: true })
  const networkRequest = fetch(request).then((response) => {
    if (response && response.status === 200) {
      void cache.put(request, response.clone())
    }
    notifyClient(clientId, 'navigation_network_success', {
      path: new URL(request.url).pathname,
      elapsedMs: Date.now() - startedAt,
      status: response.status,
      cachedForFallback: response.status === 200,
    })
    return response
  })

  if (!cached) {
    return networkRequest
  }

  return new Promise((resolve) => {
    let settled = false
    const timeoutId = setTimeout(() => {
      settled = true
      notifyClient(clientId, 'navigation_cache_fallback', {
        path: new URL(request.url).pathname,
        elapsedMs: Date.now() - startedAt,
        reason: 'timeout',
      })
      resolve(cached)
    }, NAVIGATION_TIMEOUT_MS)

    networkRequest.then((response) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      resolve(response)
    }).catch((error) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      notifyClient(clientId, 'navigation_cache_fallback', {
        path: new URL(request.url).pathname,
        elapsedMs: Date.now() - startedAt,
        reason: 'network_error',
        message: error instanceof Error ? error.message : String(error),
      })
      resolve(cached)
    })
  })
}

function reportStaticCacheHit(clientId, path) {
  if (reportedStaticCacheHits.has(path) || reportedStaticCacheHits.size >= 10) return
  reportedStaticCacheHits.add(path)
  notifyClient(clientId, 'next_static_cache_hit', { path })
}

async function notifyClient(clientId, type, details) {
  if (!clientId) return
  const client = await clients.get(clientId)
  client?.postMessage({ source: 'ashtanga-service-worker', type, details })
}
