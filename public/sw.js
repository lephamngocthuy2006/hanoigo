// Service worker của HANOI GO!: cho phép cài web như app và nhận thông báo đẩy.
// Không lưu cache trang (luôn lấy bản mới nhất từ mạng) để tránh kẹt bản cũ sau mỗi lần cập nhật.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Không có fetch handler: mọi lượt tải đi thẳng ra mạng, không qua service worker (nhanh hơn trên Safari).
// Chrome hiện không còn bắt buộc fetch handler để cho "cài app".

self.addEventListener('push', (event) => {
  let data = {}
  // Tự giải mã UTF-8 thay vì để trình duyệt đoán bảng mã
  const text = event.data ? new TextDecoder('utf-8').decode(event.data.arrayBuffer()) : ''
  try { data = text ? JSON.parse(text) : {} } catch { data = { body: text } }
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
