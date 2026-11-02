import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Mã QR tại từng điểm: chứa đường link .../#/scan/<mã>, nên quét bằng camera điện thoại cũng mở thẳng web
const TOKEN = /^[0-9a-f]{16}$/i

// Luôn trỏ về web thật (kể cả khi in mã từ máy đang chạy thử)
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'https://lephamngocthuy2006.github.io/hanoigo/'
export const qrUrl = (token) => `${PUBLIC_URL}#/scan/${token}`

// Lấy mã từ nội dung QR (link đầy đủ hoặc chỉ mã)
export function parseQrToken(text) {
  const s = String(text || '').trim()
  const m = s.match(/#\/scan\/([0-9a-f]{16})/i)
  if (m) return m[1].toLowerCase()
  return TOKEN.test(s) ? s.toLowerCase() : null
}

export const scanQr = (token) => supabase.rpc('scan_quest_qr', { p_token: token })

// Đã quét QR của nhiệm vụ này trong 2 giờ qua chưa (khớp với điều kiện của complete_quest)
export function useQrVerified(questId, userId) {
  const [verified, setVerified] = useState(false)
  const check = useCallback(async () => {
    if (!questId || !userId) return
    const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    const { data } = await supabase.from('quest_qr_scans').select('scanned_at')
      .eq('user_id', userId).eq('quest_id', questId).gt('scanned_at', since).maybeSingle()
    setVerified(!!data)
  }, [questId, userId])
  useEffect(() => { check() }, [check])
  return [verified, setVerified]
}
