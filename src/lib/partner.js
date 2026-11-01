import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { tr, locale } from './i18n'

export const CATEGORIES = {
  food: { label: tr('Ẩm thực'), emoji: '🍜' },
  cafe: { label: tr('Cà phê'), emoji: '☕' },
  attraction: { label: tr('Điểm tham quan'), emoji: '🏛️' },
  stay: { label: tr('Lưu trú'), emoji: '🏨' },
  shopping: { label: tr('Mua sắm'), emoji: '🛍️' },
  other: { label: tr('Khác'), emoji: '🏪' },
}

// Hồ sơ đối tác của tài khoản hiện tại (null nếu chưa đăng ký)
export function useMyPartner(userId) {
  const [partner, setPartner] = useState(undefined)
  const [error, setError] = useState(null)
  const reload = useCallback(async () => {
    const { data, error: err } = await supabase.from('partners').select('*').eq('owner_id', userId).maybeSingle()
    if (err) setError(err)
    setPartner(data ?? null)
  }, [userId])
  useEffect(() => { reload() }, [reload])
  return { partner, error, reload }
}

export const fmtDateVN = (d) => (d ? new Date(d).toLocaleDateString(locale) : '')
