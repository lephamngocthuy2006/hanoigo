import L from 'leaflet'
import { toCodepoint } from '../components/Emoji'

const ONLY_EMOJI = /^\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*$/u
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// Ghim bản đồ: emoji dùng ảnh Noto (đồng bộ với phần còn lại của app), số / dấu ✓ giữ dạng chữ.
// Nội dung có thể do đối tác nhập nên luôn được escape trước khi đưa vào HTML.
export function pinIcon(emoji, variant = '') {
  const text = escapeHtml(emoji)
  const inner = ONLY_EMOJI.test(emoji)
    ? `<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/${toCodepoint(emoji)}/emoji.svg" alt="${text}" />`
    : text
  return L.divIcon({
    className: '',
    html: `<div class="map-pin ${escapeHtml(variant)}"><span>${inner}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -36],
  })
}
