import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

const PROFILE_COLS = 'id, username, display_name, avatar, xp, streak, last_active_date, best_streak'

// Toàn bộ quan hệ bạn bè của người dùng hiện tại, chia thành 3 nhóm
export function useFriendships(userId) {
  const [state, setState] = useState({ friends: [], incoming: [], outgoing: [], loaded: false })

  const reload = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('friendships')
      .select(`id, status, requester, addressee, created_at,
        requester_profile:profiles!friendships_requester_fkey(${PROFILE_COLS}),
        addressee_profile:profiles!friendships_addressee_fkey(${PROFILE_COLS})`)
      .order('created_at', { ascending: false })
    if (error) {
      // bảng chưa tạo (chưa chạy 002_friends.sql) → coi như chưa có bạn
      setState((s) => ({ ...s, loaded: true, error }))
      return
    }
    const rows = data.map((f) => ({
      ...f,
      other: f.requester === userId ? f.addressee_profile : f.requester_profile,
    }))
    setState({
      friends: rows.filter((f) => f.status === 'accepted'),
      incoming: rows.filter((f) => f.status === 'pending' && f.addressee === userId),
      outgoing: rows.filter((f) => f.status === 'pending' && f.requester === userId),
      loaded: true,
    })
  }, [userId])

  useEffect(() => {
    reload()
    // cập nhật khi quay lại tab (bạn vừa chấp nhận lời mời trên máy khác…)
    const onFocus = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [reload])

  return { ...state, reload }
}

export async function searchUsers(query, excludeId) {
  const q = query.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (q.length < 2) return []
  const { data } = await supabase
    .from('profiles')
    .select(PROFILE_COLS)
    .ilike('username', `${q}%`)
    .neq('id', excludeId)
    .order('username')
    .limit(10)
  return data || []
}

// Lượt thích của các trang nhật ký: { entryId: { count, mine, names } }
export async function loadLikes(entryIds, userId) {
  if (!entryIds.length) return {}
  const { data } = await supabase
    .from('journal_likes')
    .select('entry_id, user_id, profiles(display_name, username)')
    .in('entry_id', entryIds)
  const map = {}
  ;(data || []).forEach((l) => {
    map[l.entry_id] ??= { count: 0, mine: false, names: [] }
    map[l.entry_id].count += 1
    if (l.user_id === userId) map[l.entry_id].mine = true
    else map[l.entry_id].names.push(l.profiles?.display_name || l.profiles?.username)
  })
  return map
}

export function toggleLike(entryId, liked, userId) {
  return liked
    ? supabase.from('journal_likes').delete().eq('entry_id', entryId).eq('user_id', userId)
    : supabase.from('journal_likes').insert({ entry_id: entryId, user_id: userId })
}
