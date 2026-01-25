// 使用时间戳作为版本号，每次构建时自动更新
const CACHE_NAME = `ashtanga-${Date.now()}`
const urlsToCache = [
  '/',
  '/icon.png',
  '/apple-icon.png',
  '/manifest.json'
]

// 安装Service Worker - 立即激活，等待中状态
self.addEventListener('install', event => {
  // 跳过等待，立即激活新的Service Worker
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
})

// 激活Service Worker - 立即控制所有客户端
self.addEventListener('activate', event => {
  // 立即控制所有客户端
  event.waitUntil(
    (async () => {
      // 立即控制所有客户端
      await clients.claim()

      // 删除所有旧缓存
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })()
  )
})

// 拦截请求 - Network First策略，确保总是获取最新内容
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // 对于HTML页面，使用Network First（优先网络，确保最新）
  if (event.request.mode === 'navigate' ||
      event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 网络成功，克隆并缓存
          if (response && response.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // 网络失败，尝试使用缓存
          return caches.match(event.request)
        })
    )
    return
  }

  // 对于静态资源（图标等），使用Cache First（优先缓存，提升性能）
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          const responseToCache = response.clone()
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache)
            })
          return response
        })
      })
  )
})
