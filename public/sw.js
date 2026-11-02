// Service worker của HANOI GO!: cho phép cài web như app và nhận thông báo đẩy.
// Không lưu cache trang (luôn lấy bản mới nhất từ mạng) để tránh kẹt bản cũ sau mỗi lần cập nhật.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Chrome cần có fetch handler để coi là "cài được"; cứ để trình duyệt tự tải như bình thường
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() } }
  const title = data.title || 'HANOI GO!'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: data.tag,
    renotify: !!data.tag,
    data: { url: data.url || './' },
  }))
})

// Bấm vào thông báo: mở đúng trang (dùng lại tab đang mở nếu có)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || './', self.registration.scope).href
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const tab = tabs.find((c) => c.url.startsWith(self.registration.scope))
    if (tab) {
      await tab.focus()
      return tab.navigate(url).catch(() => null)
    }
    return self.clients.openWindow(url)
  })())
})
