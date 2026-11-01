import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { todayVN } from './game'
import { useAuth } from '../context/AuthContext'

// Danh sách nhiệm vụ + trạng thái hoàn thành của người dùng hiện tại
export function useQuests() {
  const { user } = useAuth()
  const [quests, setQuests] = useState([])
  const [done, setDone] = useState({}) // quest_id -> { ever: bool, today: bool }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    const [q, c] = await Promise.all([
      supabase.from('quests').select('*').order('sort_order'),
      supabase.from('quest_completions').select('quest_id, completed_on').eq('user_id', user.id),
    ])
    if (q.error || c.error) {
      setError(q.error || c.error)
    } else {
      const today = todayVN()
      const map = {}
      c.data.forEach(({ quest_id, completed_on }) => {
        map[quest_id] ??= { ever: false, today: false }
        map[quest_id].ever = true
        if (completed_on === today) map[quest_id].today = true
      })
      setQuests(q.data)
      setDone(map)
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  const isDone = (quest) => (quest.is_daily ? done[quest.id]?.today : done[quest.id]?.ever) || false

  return { quests, isDone, loading, error, reload: load }
}
