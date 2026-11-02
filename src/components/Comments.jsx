import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addComment, deleteComment, loadCommentReactions, loadComments, personName, setCommentReaction, timeAgo } from '../lib/social'
import { friendlyError } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import Emoji from './Emoji'
import ReactionBar from './ReactionBar'
import { tr } from '../lib/i18n'

// Chuỗi dài hơn số này thì thu gọn, bấm "Xem n phản hồi" để mở
const SHOW_REPLIES = 2

/**
 * Bình luận dưới một trang Sổ hành trình, có trả lời 1 cấp (giống Facebook).
 * Người viết xoá được bình luận của mình; chủ trang xoá được mọi bình luận.
 */
export default function Comments({ entryId, ownerId, userId, onCount }) {
  const toast = useToast()
  const confirm = useConfirm()
  const [items, setItems] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [reactions, setReactions] = useState({})
  const [replyTo, setReplyTo] = useState(null) // bình luận đang trả lời
  const [expanded, setExpanded] = useState(() => new Set())
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    let alive = true
    setItems(null)
    setReactions({})
    setReplyTo(null)
    loadComments(entryId).then(async ({ data, error }) => {
      if (!alive) return
      setItems(error ? [] : data)
      const map = await loadCommentReactions((data || []).map((c) => c.id), userId)
      if (alive) setReactions(map)
    })
    return () => { alive = false }
  }, [entryId])

  useEffect(() => { if (items) onCount?.(items.length) }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  const startReply = (c) => {
    setReplyTo(c)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    const { data, error } = await addComment(entryId, userId, text, replyTo?.id ?? null)
    setBusy(false)
    if (error) return toast(friendlyError(error), 'error')
    setItems((list) => [...(list || []), data])
    setText('')
    setReplyTo(null)
    if (data.parent_id) setExpanded((s) => new Set(s).add(data.parent_id))
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-id="${data.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  const remove = async (c) => {
    const hasReplies = !c.parent_id && items.some((x) => x.parent_id === c.id)
    const msg = hasReplies ? tr('Xoá bình luận này và các phản hồi bên dưới?') : tr('Xoá bình luận này?')
    if (!(await confirm(msg, { ok: tr('Xoá'), danger: true }))) return
    const { error } = await deleteComment(c.id)
    if (error) return toast(friendlyError(error), 'error')
    setItems((list) => list.filter((x) => x.id !== c.id && x.parent_id !== c.id))
    if (replyTo?.id === c.id || replyTo?.parent_id === c.id) setReplyTo(null)
  }

  const renderComment = (c, parent) => {
    // trả lời một phản hồi (không phải tác giả bình luận gốc) → ghi tên người được trả lời
    const tag = parent && c.reply_user && c.reply_to !== parent.user_id ? c.reply_user : null
    const react = reactions[c.id]
    return (
      <div className={`comment${parent ? ' reply' : ''}`} data-id={c.id}>
        <Link to={c.user_id === userId ? '/me' : `/u/${c.author?.username}`} className="comment-avatar">
          <Emoji e={c.author?.avatar || '🐢'} play="static" />
        </Link>
        <div className="comment-body">
          <div className="comment-bubble">
            <strong>{personName(c.author)}</strong>
            <span className="comment-text">
              {tag && <Link className="comment-tag" to={tag.id === userId ? '/me' : `/u/${tag.username}`}>{personName(tag)}</Link>}
              {tag && ' '}{c.body}
            </span>
          </div>
          <div className="comment-meta">
            <span>{timeAgo(c.created_at)}</span>
            <ReactionBar compact userId={userId} like={react}
              onChange={(next) => setReactions((m) => ({ ...m, [c.id]: next }))}
              save={(next, prev) => setCommentReaction(c.id, userId, next, prev)} />
            <button type="button" className="link-btn reply-btn" onClick={() => startReply(c)}>{tr('Trả lời')}</button>
            {(c.user_id === userId || ownerId === userId) && (
              <button type="button" className="link-btn" onClick={() => remove(c)}>{tr('Xoá')}</button>
            )}
            {react?.count > 0 && (
              <span className="comment-reacts" title={react.people.map((p) => `${p.reaction} ${p.name}`).join('\n')}>
                {react.top.map((e) => <Emoji key={e} e={e} play="static" />)}
                {react.count > 1 && <span>{react.count}</span>}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const roots = (items || []).filter((c) => !c.parent_id)
  const repliesOf = (id) => (items || []).filter((c) => c.parent_id === id)

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
          {roots.map((c) => {
            const replies = repliesOf(c.id)
            const open = expanded.has(c.id) || replies.length <= SHOW_REPLIES
            const shown = open ? replies : replies.slice(-1)
            return (
              <li key={c.id}>
                {renderComment(c, null)}
                {replies.length > 0 && (
                  <div className="comment-replies">
                    {!open && (
                      <button type="button" className="link-btn more-replies" onClick={() => setExpanded((s) => new Set(s).add(c.id))}>
                        ↳ {tr('Xem thêm {0} phản hồi', replies.length - shown.length)}
                      </button>
                    )}
                    {shown.map((r) => <div key={r.id}>{renderComment(r, c)}</div>)}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {replyTo && (
        <div className="replying">
          <span>{tr('Đang trả lời ')}<strong>{personName(replyTo.author)}</strong></span>
          <button type="button" className="link-btn" onClick={() => setReplyTo(null)} aria-label={tr('Huỷ trả lời')}>✕</button>
        </div>
      )}
      <form className="comment-form" onSubmit={send}>
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} maxLength={300}
          placeholder={replyTo ? tr('Trả lời {0}…', personName(replyTo.author)) : tr('Viết bình luận…')}
          aria-label={tr('Viết bình luận…')} enterKeyHint="send"
          onKeyDown={(e) => e.key === 'Escape' && replyTo && (e.stopPropagation(), setReplyTo(null))} />
        <button className="btn primary" disabled={busy || !text.trim()} aria-label={tr('Gửi')}>{tr('Gửi')}</button>
      </form>
    </section>
  )
}
