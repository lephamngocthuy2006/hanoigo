// Giao diện Sáng / Tối / Theo máy. Lưu lựa chọn trong máy; "Theo máy" đi theo cài đặt hệ điều hành.
// index.html đã đặt sẵn data-theme trước khi tải CSS để không bị chớp trắng.
import { useSyncExternalStore } from 'react'

const KEY = 'hanoigo-theme'
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const META = { light: '#8f2d3a', dark: '#1f1815' }
const listeners = new Set()

function readPref() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* chế độ ẩn danh */ }
  return 'system'
}

let pref = readPref()
const resolve = () => (pref === 'system' ? (media?.matches ? 'dark' : 'light') : pref)
let state = { pref, theme: resolve() }

function apply() {
  state = { pref, theme: resolve() }
  document.documentElement.dataset.theme = state.theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[state.theme])
  listeners.forEach((fn) => fn())
}

if (typeof document !== 'undefined') {
  apply()
  media?.addEventListener('change', () => pref === 'system' && apply())
}

export function setThemePref(next) {
  pref = next
  try {
    if (next === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch { /* bỏ qua */ }
  apply()
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

// { pref: 'light' | 'dark' | 'system', theme: 'light' | 'dark' }
export const useTheme = () => useSyncExternalStore(subscribe, () => state)
