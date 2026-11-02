import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Thông báo đẩy (Web Push): báo cả khi đã đóng web.
// Khoá công khai VAPID — phần khoá bí mật chỉ nằm trong Supabase Edge Function "send-push".
const VAPID_PUBLIC_KEY = 'BDpVFT-gowcQY-2lvnCgFdyPPKl_3Pgch2TD7ea7YTixFJc4E9s5Y2uj3K61LnDMly651-gbwL17nMBuqOKxS6k'

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => null))
}

function keyBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) || navigator.serviceWorker.register('./sw.js')
}

// Người dùng tự tắt trong Cài đặt → không tự bật lại, không mời lại
const OFF_KEY = 'hanoigo-push-off'
// Bấm "Để sau" ở lời mời → mời lại sau 7 ngày
const LATER_KEY = 'hanoigo-push-later'
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* ẩn danh */ } },
}
export const pushTurnedOff = () => store.get(OFF_KEY) === '1'
export const askLater = () => store.set(LATER_KEY, String(Date.now()))
const askedRecently = () => Date.now() - Number(store.get(LATER_KEY) || 0) < 7 * 86400 * 1000

// Trạng thái: 'unsupported' | 'need-install' (iPhone chưa thêm ra màn hình chính) | 'denied' | 'on' | 'off'
export function usePush(userId) {
  const [state, setState] = useState(null) // null: đang kiểm tra
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!pushSupported()) return setState(isIOS() && !isStandalone() ? 'need-install' : 'unsupported')
    if (Notification.permission === 'denied') return setState('denied')
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    setState(sub ? 'on' : 'off')
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const enable = async () => {
    setBusy(true)
    try {
      store.set(OFF_KEY, null)
      if ((await Notification.requestPermission()) !== 'granted') return refresh()
      const reg = await registration()
      await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription())
        || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
      const { endpoint, keys } = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions')
        .upsert({ user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' })
      if (error) throw error
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      store.set(OFF_KEY, '1')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  // Đã cho phép từ trước nhưng thiết bị chưa đăng ký (ví dụ vừa cập nhật web) → tự đăng ký lại, không hỏi
  // Chưa từng hỏi → nên hiện lời mời
  const shouldInvite = state === 'off' && pushSupported() && Notification.permission === 'default' && !pushTurnedOff() && !askedRecently()
  useEffect(() => {
    if (state === 'off' && pushSupported() && Notification.permission === 'granted' && !pushTurnedOff()) enable().catch(() => null)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return { state, busy, enable, disable, shouldInvite }
}

// Nút "Cài app": Chrome/Edge/Android có hộp thoại cài; iPhone phải tự thêm ra màn hình chính
let deferredPrompt = null
const installListeners = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    installListeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installListeners.forEach((fn) => fn())
  })
}

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force((n) => n + 1)
    installListeners.add(fn)
    return () => installListeners.delete(fn)
  }, [])
  const installed = isStandalone()
  const canPrompt = !!deferredPrompt
  const install = async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    force((n) => n + 1)
    return outcome === 'accepted'
  }
  return { installed, canPrompt, install, ios: isIOS() }
}
