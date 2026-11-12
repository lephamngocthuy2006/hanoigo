import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Gói Premium cho Sổ hành trình (thử nghiệm). Cài đặt chung nằm trong bảng app_settings (1 dòng),
// chỉ quản trị viên tối cao sửa được. Chưa chạy SQL 022 → coi như tắt (không khoá gì).

let cache = null
const listeners = new Set()

async function fetchSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
  cache = error ? { premium_enabled: false } : data || { premium_enabled: false }
  listeners.forEach((fn) => fn(cache))
  return cache
}

export function useAppSettings() {
  const [settings, setSettings] = useState(cache)
  useEffect(() => {
    listeners.add(setSettings)
    if (!cache) fetchSettings()
    // quay lại tab → lấy cài đặt mới (quản trị viên có thể vừa bật/tắt Premium)
    const onFocus = () => document.visibilityState === 'visible' && fetchSettings()
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      listeners.delete(setSettings)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])
  const reload = useCallback(() => fetchSettings(), [])
  return { settings, loading: !settings, reload }
}

// Có bị khoá Sổ hành trình không: đang bật Premium, chưa mua, không phải quản trị viên
export const journalLocked = (profile, settings) =>
  !!settings?.premium_enabled && !!profile && !profile.is_premium && !profile.is_admin

// Chưa tải xong cài đặt mà người này có thể bị khoá → chờ, tránh lộ Sổ hành trình một giây rồi mới khoá
export const journalPending = (profile, settings) =>
  !settings && (!profile || (!profile.is_premium && !profile.is_admin))

export const fmtVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`

// Nội dung chuyển khoản để quản trị viên đối chiếu
export const transferNote = (username) => `HANOIGO ${username || ''}`.trim().toUpperCase()
