import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addComment, deleteComment, loadComments, personName, timeAgo } from '../lib/social'
import { friendlyError } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import Emoji from './Emoji'
import { tr } from '../lib/i18n'

/**
 * Bình luận dưới một trang Sổ hành trình.
 * Người viết xoá được bình luận của mình; chủ trang xoá được mọi bình luận.
 */
export default function Comments({ entryId, ownerId, userId, onCount }) {
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    let alive = true
    setItems(null)
    loadComments(entryId).then(({ data, error }) => {
      if (!alive) return
      setItems(error ? [] : data)
    })
    return () => { alive = false }
  }, [entryId])

  useEffect(() => { if (items) onCount?.(items.length) }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    const { data, error } = await addComment(entryId, userId, text)
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    setItems((list) => [...(list || []), data])
    setText('')
    requestAnimationFrame(() => listRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  const remove = async (c) => {
    if (!confirm(tr('Xoá bình luận này?'))) return
    const { error } = await deleteComment(c.id)
    if (error) return toast(friendlyError(error), 'error')
    setItems((list) => list.filter((x) => x.id !== c.id))
  }

  return (
    <section className="comments">
      <div className="comments-head">
        <Emoji e="💬" play="static" /> {tr('Bình luận')}
        {items?.length > 0 && <span className="muted small"> · {items.length}</span>}
      </div>

      {items === null ? <div className="spinner small" /> : items.length === 0 ? (
        <p className="muted small comments-empty">{tr('Chưa có bình luận nào. Hãy là người đầu tiên!')}</p>
      ) : (
        <ul className="comment-list" ref={listRef}>
          {items.map((c) => (
            <li key={c.id} className="comment">
              <Link to={c.user_id === userId ? '/me' : `/u/${c.author?.username}`} className="comment-avatar">
                <Emoji e={c.author?.avatar || '🐢'} play="static" />
              </Link>
              <div className="comment-body">
                <div className="comment-bubble">
                  <strong>{personName(c.author)}</strong>
                  <span className="comment-text">{c.body}</span>
                </div>
                <div className="comment-meta">
                  <span>{timeAgo(c.created_at)}</span>
                  {(c.user_id === userId || ownerId === userId) && (
                    <button type="button" className="link-btn" onClick={() => remove(c)}>{tr('Xoá')}</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="comment-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300}
          placeholder={tr('Viết bình luận…')} aria-label={tr('Viết bình luận…')} enterKeyHint="send" />
        <button className="btn primary" disabled={busy || !text.trim()} aria-label={tr('Gửi')}>{tr('Gửi')}</button>
      </form>
    </section>
  )
}
