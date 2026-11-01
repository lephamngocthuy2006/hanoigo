// Song ngữ Việt – Anh. Chuỗi gốc tiếng Việt chính là khoá tra từ điển,
// nên chỗ nào chưa có bản dịch sẽ tự hiện tiếng Việt.
// Đổi ngôn ngữ sẽ tải lại trang để mọi nhãn (kể cả hằng số) cập nhật cùng lúc.
import EN from './en'

const KEY = 'hanoigo-lang'

function detect() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'vi' || saved === 'en') return saved
  } catch { /* chế độ ẩn danh */ }
  return 'vi'
}

export const lang = detect()
export const isEn = lang === 'en'
export const locale = isEn ? 'en-GB' : 'vi-VN'
const dict = isEn ? EN : {}

if (typeof document !== 'undefined') document.documentElement.lang = lang

export function setLang(next) {
  try { localStorage.setItem(KEY, next) } catch { /* bỏ qua */ }
  window.location.reload()
}

// tr('Giữ chuỗi {0} ngày nhé!', 3) → "Keep your 3-day streak going!"
export function tr(s, ...args) {
  if (typeof s !== 'string') return s
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)
  const out = m[1] + (dict[m[2]] ?? m[2]) + m[3]
  return args.length ? out.replace(/\{(\d+)\}/g, (_, i) => args[i] ?? '') : out
}

// Lỗi trả về từ máy chủ (tiếng Việt): khớp đúng chuỗi, hoặc mẫu có % là giá trị thay vào
const PATTERNS = Object.keys(dict)
  .filter((k) => k.includes('%') && !k.startsWith('%'))
  .map((k) => [new RegExp('^' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '(.+?)') + '$'), dict[k]])

export function trMsg(msg) {
  if (!isEn || !msg) return msg
  if (dict[msg]) return dict[msg]
  for (const [re, en] of PATTERNS) {
    const m = msg.match(re)
    if (m) {
      let i = 1
      return en.replace(/%/g, () => m[i++])
    }
  }
  return msg
}

// Dữ liệu từ máy chủ: thay cột xxx bằng xxx_en khi đang dùng tiếng Anh (cả object lồng nhau)
export function localize(value) {
  if (!isEn || value == null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(localize)
  const out = {}
  for (const [k, v] of Object.entries(value)) out[k] = localize(v)
  for (const k of Object.keys(value)) {
    if (k.endsWith('_en') && value[k] != null && value[k] !== '') out[k.slice(0, -3)] = value[k]
  }
  return out
}
