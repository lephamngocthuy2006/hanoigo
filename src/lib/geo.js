import { tr } from './i18n'
export function distanceM(a, b) {
  const R = 6371000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(m) {
  if (m == null) return ''
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

export function getPosition({ timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error(tr('Thiết bị không hỗ trợ định vị')))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        const map = {
          1: tr('Bạn chưa cho phép truy cập vị trí. Hãy bật quyền vị trí cho trình duyệt.'),
          2: tr('Không xác định được vị trí. Thử ra chỗ thoáng hơn nhé.'),
          3: tr('Lấy vị trí quá lâu, thử lại nhé.'),
        }
        reject(new Error(map[err.code] || err.message))
      },
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    )
  })
}
