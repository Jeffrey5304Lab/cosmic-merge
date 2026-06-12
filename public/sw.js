/** 離線支援：同源 GET 走 stale-while-revalidate */
const CACHE = 'cosmic-merge-v1'

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
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request)
      const network = fetch(request)
        .then(res => {
          if (res.ok) cache.put(request, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
