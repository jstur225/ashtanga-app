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

// 拦截请求
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 缓存命中，返回缓存
        if (response) {
          return response
        }
        return fetch(event.request).then(response => {
          // 检查是否是有效响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          // 克隆响应
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
