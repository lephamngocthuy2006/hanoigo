import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'

// Tour + điểm dừng (đã sắp thứ tự) + tour nào mình đã nhận thưởng
export function useTours() {
  const { user } = useAuth()
  const [tours, setTours] = useState([])
  const [claimed, setClaimed] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const [t, c] = await Promise.all([
      supabase.from('tours').select('*, tour_stops(quest_id, position, note)').order('sort_order'),
      supabase.from('tour_completions').select('tour_id').eq('user_id', user.id),
    ])
    if (t.error) setError(t.error)
    else {
      setTours(t.data.map((tour) => ({ ...tour, stops: [...tour.tour_stops].sort((a, b) => a.position - b.position) })))
      setClaimed(new Set((c.data || []).map((x) => x.tour_id)))
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  return { tours, claimed, loading, error, reload: load }
}

// Tiến độ tour dựa trên danh sách nhiệm vụ đã hoàn thành
export function tourProgress(tour, isDoneById) {
  const done = tour.stops.filter((s) => isDoneById(s.quest_id)).length
  return { done, total: tour.stops.length, pct: tour.stops.length ? Math.round((done / tour.stops.length) * 100) : 0 }
}

// Đi bộ ~4,5 km/h, đường thực tế dài hơn đường chim bay ~30%
export function walkMinutes(meters) {
  return Math.max(1, Math.round(((meters * 1.3) / 4500) * 60))
}
