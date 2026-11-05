import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { tr } from './i18n'

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
      .or(`requester.eq.${userId},addressee.eq.${userId}`)
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

// Cảm xúc "vui" (🤬 Đập bàn — rung màn hình). Đặt false để ẩn khi đi thi.
export const ENABLE_FUN_REACTIONS = true

export const REACTIONS = [
  { e: '👍', label: tr('Thích') },
  { e: '❤️', label: tr('Yêu thích') },
  { e: '🥰', label: tr('Thương thương') },
  { e: '😆', label: 'Haha' },
  { e: '😮', label: 'Wow' },
  { e: '😢', label: tr('Buồn') },
  { e: '😡', label: tr('Phẫn nộ') },
  ...(ENABLE_FUN_REACTIONS ? [{ e: '🤬', label: tr('Đập bàn!'), shake: true }] : []),
]
export const reactionLabel = (e) => REACTIONS.find((r) => r.e === e)?.label || (e === '🤬' ? tr('Đập bàn!') : tr('Thả cảm xúc'))

// Gom các lượt cảm xúc theo key: { [key]: { count, mine, top: [emoji…], people: [{ name, reaction }] } }
export function summarizeReactions(rows, key, userId) {
  const map = {}
  rows.forEach((l) => {
    const r = l.reaction || '❤️'
    map[l[key]] ??= { count: 0, mine: null, counts: {}, people: [] }
    const m = map[l[key]]
    m.count += 1
    m.counts[r] = (m.counts[r] || 0) + 1
    if (l.user_id === userId) m.mine = r
    else m.people.push({ name: l.profiles?.display_name || l.profiles?.username, username: l.profiles?.username, reaction: r })
  })
  Object.values(map).forEach((m) => {
    m.top = Object.entries(m.counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e)
  })
  return map
}

// Cảm xúc của các trang nhật ký
export async function loadLikes(entryIds, userId) {
  if (!entryIds.length) return {}
  const { data } = await supabase
    .from('journal_likes')
    .select('entry_id, user_id, reaction, profiles(display_name, username)')
    .in('entry_id', entryIds)
  return summarizeReactions(data || [], 'entry_id', userId)
}

// Thả / đổi / gỡ cảm xúc. previous: cảm xúc hiện tại (null nếu chưa thả), reaction: null để gỡ
export function setReaction(entryId, userId, reaction, previous) {
  const mine = supabase.from('journal_likes')
  if (!reaction) return mine.delete().eq('entry_id', entryId).eq('user_id', userId)
  if (previous) return mine.update({ reaction }).eq('entry_id', entryId).eq('user_id', userId)
  return mine.insert({ entry_id: entryId, user_id: userId, reaction })
}
