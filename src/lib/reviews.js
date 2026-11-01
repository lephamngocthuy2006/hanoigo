import { supabase } from './supabase'

export const CRITERIA = [
  { key: 'attraction', label: 'Mức độ hấp dẫn', hint: 'Cảnh quan, giá trị văn hóa – lịch sử' },
  { key: 'information', label: 'Hướng dẫn & thông tin', hint: 'Dễ tìm đường, thông tin rõ ràng' },
  { key: 'facilities', label: 'Dịch vụ & tiện ích', hint: 'Vệ sinh, chỗ nghỉ, an toàn, thái độ phục vụ' },
  { key: 'value', label: 'Xứng đáng thời gian & chi phí', hint: 'Trải nghiệm so với công sức bỏ ra' },
]

export async function loadReviews(filter) {
  let q = supabase
    .from('reviews')
    .select('*, profiles(username, display_name, avatar)')
    .order('created_at', { ascending: false })
  if (filter?.questId) q = q.eq('quest_id', filter.questId)
  if (filter?.tourId) q = q.eq('tour_id', filter.tourId)
  const { data, error } = await q
  if (error) throw error
  return data
}

const avg = (rows, key) => (rows.length ? rows.reduce((s, r) => s + r[key], 0) / rows.length : 0)

export function summarize(rows) {
  return {
    count: rows.length,
    overall: avg(rows, 'overall'),
    criteria: Object.fromEntries(CRITERIA.map((c) => [c.key, avg(rows, c.key)])),
    recommendPct: rows.length ? Math.round((rows.filter((r) => r.recommend).length / rows.length) * 100) : 0,
  }
}

export const fmtScore = (n) => (n ? n.toFixed(1).replace('.', ',') : '—')
