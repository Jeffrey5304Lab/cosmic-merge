/**
 * 離線支援：
 * - HTML 導覽 → network-first（線上永遠拿最新版，離線退回快取）
 * - 其餘同源 GET（hashed 資源、圖片）→ cache-first（檔名帶 hash，內容不變）
 */
const CACHE = 'cosmic-merge-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return

  // HTML 導覽：network-first → 更新立刻可見，離線退快取
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put(request, copy))
          return res
        })
        .catch(async () => (await caches.match(request)) || caches.match('./')),
    )
    return
  }

  // 其餘資源：cache-first，未命中再抓網路並補快取
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request)
      if (cached) return cached
      const res = await fetch(request)
      if (res.ok) cache.put(request, res.clone())
      return res
    }),
  )
})
