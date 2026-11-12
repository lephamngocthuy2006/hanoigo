import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Web có đang tạm ngưng không (chủ web bật trong Cài đặt). Ai cũng đọc được, kể cả chưa đăng nhập.
// Chưa chạy SQL 024 / lỗi mạng → coi như đang mở, không chặn ai.

let cache = null
const listeners = new Set()

async function fetchStatus() {
  const { data, error } = await supabase.rpc('site_status')
  cache = { paused: !error && !!data?.paused }
  listeners.forEach((fn) => fn(cache))
  return cache
}

export function useSiteStatus() {
  const [status, setStatus] = useState(cache)
  useEffect(() => {
    listeners.add(setStatus)
    if (!cache) fetchStatus()
    // quay lại tab → xem chủ web vừa mở lại / tạm ngưng chưa
    const onFocus = () => document.visibilityState === 'visible' && fetchStatus()
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      listeners.delete(setStatus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])
  const reload = useCallback(() => fetchStatus(), [])
  return { status, loading: !status, reload }
}

export async function setSitePaused(paused) {
  const { error } = await supabase.rpc('owner_set_site_paused', { p_paused: paused })
  if (error) throw error
  return fetchStatus()
}

// Liên hệ admin khi web tạm ngưng
export const ADMIN_CONTACTS = [
  { name: 'Lê Phạm Ngọc Thuỷ', role: 'Admin · Quán quân', url: 'https://web.facebook.com/le.ngoc.thuy.373839' },
]
