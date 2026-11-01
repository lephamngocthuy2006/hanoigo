import { useState } from 'react'
import { toggleLike } from '../lib/friends'
import { friendlyError } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

// Nút thả tim; cập nhật ngay trên giao diện rồi mới gửi lên server
export default function LikeButton({ entryId, userId, like, onChange }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const liked = like?.mine || false
  const count = like?.count || 0

  const click = async () => {
    setBusy(true)
    const next = { ...(like || { names: [] }), mine: !liked, count: count + (liked ? -1 : 1) }
    onChange(next)
    const { error } = await toggleLike(entryId, liked, userId)
    setBusy(false)
    if (error) {
      onChange(like)
      toast(friendlyError(error), 'error')
    }
  }

  return (
    <button className={`like-btn${liked ? ' liked' : ''}`} onClick={click} disabled={busy} aria-pressed={liked}>
      {liked ? '❤️' : '🤍'} {count > 0 ? count : 'Thả tim'}
    </button>
  )
}
