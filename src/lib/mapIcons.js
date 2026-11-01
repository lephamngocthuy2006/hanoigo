import L from 'leaflet'

export function pinIcon(emoji, variant = '') {
  return L.divIcon({
    className: '',
    html: `<div class="map-pin ${variant}"><span>${emoji}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -36],
  })
}

// Nền bản đồ OpenStreetMap (miễn phí, không cần key; không dùng subdomain a/b/c đã bị bỏ)
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTR = '&copy; OpenStreetMap'
