import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { REACTIONS, reactionLabel, setReaction } from '../lib/friends'
import { friendlyError } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import Emoji from './Emoji'
import { tr } from '../lib/i18n'

// Tính lại thống kê cảm xúc sau khi mình đổi (cập nhật giao diện ngay, không chờ server)
function applyChange(like, next) {
  const base = like || { count: 0, mine: null, counts: {}, people: [] }
  const counts = { ...base.counts }
  if (base.mine) counts[base.mine] = Math.max(0, (counts[base.mine] || 1) - 1)
  if (next) counts[next] = (counts[next] || 0) + 1
  Object.keys(counts).forEach((k) => counts[k] === 0 && delete counts[k])
  const count = Object.values(counts).reduce((a, b) => a + b, 0)
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e)
  return { ...base, mine: next, counts, count, top }
}

/**
 * Nút thả cảm xúc kiểu Facebook:
 * - Chạm nhanh: thả ❤️ (hoặc gỡ cảm xúc đang có)
 * - Giữ lâu / rê chuột / bấm nút 😊: mở bảng chọn 7 cảm xúc
 * compact: chỉ một nút chữ nhỏ (dùng dưới bình luận); save: hàm lưu thay cho cảm xúc của trang nhật ký
 */
export default function ReactionBar({ entryId, userId, like, onChange, showPeople, compact, save }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [below, setBelow] = useState(false)
  const [busy, setBusy] = useState(false)
  const pressTimer = useRef(null)
  const hoverTimer = useRef(null)
  const longPressed = useRef(false)
  const wrapRef = useRef(null)
  const mine = like?.mine || null

  const showPicker = () => {
    const rect = wrapRef.current?.getBoundingClientRect()
    const host = wrapRef.current?.closest('.modal')?.getBoundingClientRect()
    const topEdge = host ? host.top : 0
    setBelow(rect ? rect.top - topEdge < 96 : false)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e) => !wrapRef.current?.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const choose = async (next) => {
    setOpen(false)
    if (busy || next === mine) return
    // 🤬 Đập bàn: rung cả màn hình cho đã giận
    if (REACTIONS.find((r) => r.e === next)?.shake) {
      document.body.classList.remove('table-slam')
      void document.body.offsetWidth
      document.body.classList.add('table-slam')
      navigator.vibrate?.([60, 40, 90])
      setTimeout(() => document.body.classList.remove('table-slam'), 700)
    }
    setBusy(true)
    onChange(applyChange(like, next))
    const { error } = await (save ? save(next, mine) : setReaction(entryId, userId, next, mine))
    setBusy(false)
    if (error) {
      onChange(like)
      toast(friendlyError(error), 'error')
    }
  }

  const onPointerDown = () => {
    longPressed.current = false
    pressTimer.current = setTimeout(() => {
      longPressed.current = true
      showPicker()
      navigator.vibrate?.(15)
    }, 420)
  }
  const cancelPress = () => clearTimeout(pressTimer.current)
  const onClick = () => {
    if (longPressed.current) return // vừa giữ lâu để mở bảng chọn
    choose(mine ? null : '❤️')
  }

  // Rê chuột: mở sau 0,45s; rời đi thì đóng sau 0,5s (quay lại kịp thì huỷ đóng)
  const onEnter = (e) => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(hoverTimer.current)
    if (!open) hoverTimer.current = setTimeout(showPicker, 450)
  }
  const onLeave = (e) => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setOpen(false), 500)
  }

  return (
    <div className={`reaction-wrap${compact ? ' compact' : ''}`} ref={wrapRef} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      {open && (
        <div className={`reaction-picker${below ? ' below' : ''}`} role="menu" aria-label={tr('Chọn cảm xúc')}>
          {REACTIONS.map((r, i) => (
            <button key={r.e} type="button" role="menuitem" className={`reaction-option${mine === r.e ? ' picked' : ''}`}
              style={{ animationDelay: `${i * 0.03}s` }} onClick={() => choose(r.e)} aria-label={r.label}>
              <Emoji e={r.e} play="loop" />
              <span className="reaction-tip">{r.label}</span>
            </button>
          ))}
        </div>
      )}

      {compact ? (
        <button type="button" className={`link-btn reaction-link${mine ? ' active' : ''}`} disabled={busy}
          onPointerDown={onPointerDown} onPointerUp={cancelPress} onPointerLeave={cancelPress} onContextMenu={(e) => e.preventDefault()}
          onClick={onClick} aria-pressed={!!mine} aria-label={mine ? reactionLabel(mine) : tr('Thả cảm xúc')}>
          {mine ? <><Emoji e={mine} play="static" /> {reactionLabel(mine)}</> : tr('Thích')}
        </button>
      ) : (
      <div className="reaction-row">
        <button type="button" className={`reaction-btn${mine ? ' active' : ''}`} disabled={busy}
          onPointerDown={onPointerDown} onPointerUp={cancelPress} onPointerLeave={cancelPress} onContextMenu={(e) => e.preventDefault()}
          onClick={onClick} aria-pressed={!!mine}>
          {mine ? <Emoji e={mine} play="once" /> : <Emoji e="🤍" play="static" />}
          <span>{mine ? reactionLabel(mine) : tr('Thả cảm xúc')}</span>
        </button>
        <button type="button" className="reaction-more" onClick={() => (open ? setOpen(false) : showPicker())} aria-label={tr('Chọn cảm xúc khác')}>
          <Emoji e="😆" play="hover" />
          <span>+</span>
        </button>
        {like?.count > 0 && (
          <span className="reaction-summary">
            <span className="reaction-stack">{like.top.map((e) => <Emoji key={e} e={e} play="static" />)}</span>
            {like.count}
          </span>
        )}
      </div>
      )}

      {showPeople && like?.people?.length > 0 && (
        <ul className="reaction-people">
          {like.people.map((p, i) => (
            <li key={i}>
              {p.username
                ? <Link to={`/u/${p.username}`}><Emoji e={p.reaction} play="static" /> {p.name}</Link>
                : <><Emoji e={p.reaction} play="static" /> {p.name}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
