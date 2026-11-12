import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { tr, locale } from './i18n'
import { summarizeReactions } from './friends'

const ACTOR_COLS = 'id, username, display_name, avatar'
export const personName = (p) => p?.display_name || p?.username || tr('Ai đó')

// "vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước", rồi ngày tháng
export function timeAgo(s) {
  const sec = Math.max(0, (Date.now() - new Date(s).getTime()) / 1000)
  if (sec < 60) return tr('vừa xong')
  if (sec < 3600) return tr('{0} phút trước', Math.floor(sec / 60))
  if (sec < 86400) return tr('{0} giờ trước', Math.floor(sec / 3600))
  if (sec < 7 * 86400) return tr('{0} ngày trước', Math.floor(sec / 86400))
  return new Date(s).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ---------- Bình luận ----------
// parent_id: bình luận gốc của chuỗi trả lời; reply_user: người được trả lời (có thể là tác giả một phản hồi)
const COMMENT_COLS = `id, entry_id, user_id, body, created_at, parent_id, reply_to,
  author:profiles!journal_comments_user_id_fkey(${ACTOR_COLS}),
  reply_user:profiles!journal_comments_reply_to_fkey(id, username, display_name)`

export async function loadComments(entryId) {
  const { data, error } = await supabase
    .from('journal_comments')
    .select(COMMENT_COLS)
    .eq('entry_id', entryId)
    .order('created_at')
  return { data: data || [], error }
}

// Số bình luận của nhiều trang: { entryId: n }. Bảng chưa tạo (chưa chạy 012) → {}
export async function loadCommentCounts(entryIds) {
  if (!entryIds.length) return {}
  const { data } = await supabase.from('journal_comments').select('entry_id').in('entry_id', entryIds)
  const map = {}
  ;(data || []).forEach((c) => { map[c.entry_id] = (map[c.entry_id] || 0) + 1 })
  return map
}

export function addComment(entryId, userId, body, parentId = null) {
  return supabase
    .from('journal_comments')
    .insert({ entry_id: entryId, user_id: userId, body: body.trim(), parent_id: parentId })
    .select(COMMENT_COLS)
    .single()
}

export const deleteComment = (id) => supabase.from('journal_comments').delete().eq('id', id)

// Cảm xúc của các bình luận: { commentId: { count, mine, top, people } }. Bảng chưa tạo (chưa chạy 013) → {}
export async function loadCommentReactions(commentIds, userId) {
  if (!commentIds.length) return {}
  const { data } = await supabase
    .from('comment_reactions')
    .select('comment_id, user_id, reaction, profiles!comment_reactions_user_id_fkey(display_name, username)')
    .in('comment_id', commentIds)
  return summarizeReactions(data || [], 'comment_id', userId)
}

// Thả / đổi / gỡ cảm xúc cho bình luận (giống setReaction của Sổ hành trình)
export function setCommentReaction(commentId, userId, reaction, previous) {
  const mine = supabase.from('comment_reactions')
  if (!reaction) return mine.delete().eq('comment_id', commentId).eq('user_id', userId)
  if (previous) return mine.update({ reaction }).eq('comment_id', commentId).eq('user_id', userId)
  return mine.insert({ comment_id: commentId, user_id: userId, reaction })
}

// ---------- Thông báo ----------
const NOTI_COLS = `id, kind, entry_id, comment_id, reaction, body, read_at, created_at,
  actor:profiles!notifications_actor_id_fkey(${ACTOR_COLS}),
  entry:journal_entries(id, title, user_id, owner:profiles!journal_entries_user_id_fkey(username))`

// Câu hiển thị của một thông báo (không gồm tên người)
export function notiText(n) {
  const title = n.entry?.title ? ` "${n.entry.title}"` : ''
  switch (n.kind) {
    case 'reaction': return tr('đã bày tỏ cảm xúc về kỷ niệm{0} của bạn', title)
    case 'comment': return tr('đã bình luận về kỷ niệm{0} của bạn', title)
    case 'reply': return tr('cũng đã bình luận về kỷ niệm{0}', title)
    case 'comment_reaction': return tr('đã bày tỏ cảm xúc về bình luận của bạn')
    case 'comment_reply': return tr('đã trả lời bình luận của bạn')
    case 'new_user': return tr('vừa đăng ký tài khoản HANOI GO!')
    case 'premium_request': return tr('đã báo chuyển khoản gói Premium — vào xác nhận nhé')
    case 'premium_granted': return tr('đã mở gói Premium cho bạn — Sổ hành trình đã sẵn sàng!')
    case 'premium_auto': return tr('đã gửi bill và được mở Premium tự động — kiểm tra lại khi rảnh nhé')
    case 'friend_request': return tr('đã gửi lời mời kết bạn')
    case 'friend_accept': return tr('đã chấp nhận lời mời kết bạn')
    default: return ''
  }
}

export const notiIcon = (n) =>
  n.kind === 'new_user' ? '🆕' :
  n.kind.startsWith('premium_') ? '👑' :
  n.kind === 'reaction' || n.kind === 'comment_reaction' ? n.reaction || '❤️' : n.kind === 'friend_request' || n.kind === 'friend_accept' ? '🤝' : '💬'

// Mở đúng chỗ khi bấm vào thông báo
export function notiLink(n, userId) {
  if (n.kind === 'friend_request') return '/friends'
  if (n.kind === 'new_user') return '/admin?tab=users'
  if (n.kind === 'premium_request' || n.kind === 'premium_auto') return '/admin?tab=premium'
  if (n.kind === 'premium_granted') return '/journal'
  if (n.kind === 'friend_accept') return `/u/${n.actor?.username}`
  if (!n.entry) return '/journal'
  // có comment_id (trả lời / cảm xúc bình luận) → mở bài rồi cuộn tới đúng bình luận
  const comment = n.comment_id ? `&comment=${n.comment_id}` : ''
  if (n.entry.user_id === userId) return `/journal?entry=${n.entry.id}${comment}`
  return `/u/${n.entry.owner?.username}?entry=${n.entry.id}${comment}`
}

export function useNotifications(userId, onNew) {
  const [state, setState] = useState({ items: [], loaded: false })
  const onNewRef = useRef(onNew)
  onNewRef.current = onNew

  const reload = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('notifications')
      .select(NOTI_COLS)
      .order('created_at', { ascending: false })
      .limit(50)
    // bảng chưa tạo (chưa chạy 012) → coi như chưa có thông báo
    setState({ items: error ? [] : data, loaded: true })
  }, [userId])

  useEffect(() => {
    if (!userId) return
    reload()
    const onFocus = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onFocus)
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data } = await supabase.from('notifications').select(NOTI_COLS).eq('id', payload.new.id).maybeSingle()
          if (data) onNewRef.current?.(data)
        }
        reload()
      })
      .subscribe()
    return () => {
      document.removeEventListener('visibilitychange', onFocus)
      supabase.removeChannel(channel)
    }
  }, [userId, reload])

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString()
    setState((s) => ({ ...s, items: s.items.map((n) => ({ ...n, read_at: n.read_at || now })) }))
    await supabase.from('notifications').update({ read_at: now }).eq('user_id', userId).is('read_at', null)
  }, [userId])

  const markRead = useCallback(async (id) => {
    const now = new Date().toISOString()
    setState((s) => ({ ...s, items: s.items.map((n) => (n.id === id ? { ...n, read_at: n.read_at || now } : n)) }))
    await supabase.from('notifications').update({ read_at: now }).eq('id', id).eq('user_id', userId).is('read_at', null)
  }, [userId])

  const unread = state.items.filter((n) => !n.read_at).length
  return { ...state, unread, reload, markAllRead, markRead }
}
