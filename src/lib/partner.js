import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export const CATEGORIES = {
  food: { label: 'Ẩm thực', emoji: '🍜' },
  cafe: { label: 'Cà phê', emoji: '☕' },
  attraction: { label: 'Điểm tham quan', emoji: '🏛️' },
  stay: { label: 'Lưu trú', emoji: '🏨' },
  shopping: { label: 'Mua sắm', emoji: '🛍️' },
  other: { label: 'Khác', emoji: '🏪' },
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

export const fmtDateVN = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '')
