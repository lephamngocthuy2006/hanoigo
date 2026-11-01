import { useEffect, useRef, useState } from 'react'
import { REACTIONS, reactionLabel, setReaction } from '../lib/friends'
import { friendlyError } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import Emoji from './Emoji'

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
 */
export default function ReactionBar({ entryId, userId, like, onChange, showPeople }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const pressTimer = useRef(null)
  const hoverTimer = useRef(null)
  const longPressed = useRef(false)
  const wrapRef = useRef(null)
  const mine = like?.mine || null

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
    const { error } = await setReaction(entryId, userId, next, mine)
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
      setOpen(true)
      navigator.vibrate?.(15)
    }, 420)
  }
  const cancelPress = () => clearTimeout(pressTimer.current)
  const onClick = () => {
    if (longPressed.current) return // vừa giữ lâu để mở bảng chọn
    choose(mine ? null : '❤️')
  }

  const onEnter = (e) => {
    if (e.pointerType !== 'mouse') return
    hoverTimer.current = setTimeout(() => setOpen(true), 450)
  }
  const onLeave = (e) => {
    if (e.pointerType !== 'mouse') return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setOpen(false), 350)
  }

  return (
    <div className="reaction-wrap" ref={wrapRef} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      {open && (
        <div className="reaction-picker" role="menu" aria-label="Chọn cảm xúc">
          {REACTIONS.map((r, i) => (
            <button key={r.e} type="button" role="menuitem" className={`reaction-option${mine === r.e ? ' picked' : ''}`}
              style={{ animationDelay: `${i * 0.03}s` }} onClick={() => choose(r.e)} aria-label={r.label}>
              <Emoji e={r.e} play="loop" />
              <span className="reaction-tip">{r.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="reaction-row">
        <button type="button" className={`reaction-btn${mine ? ' active' : ''}`} disabled={busy}
          onPointerDown={onPointerDown} onPointerUp={cancelPress} onPointerLeave={cancelPress} onContextMenu={(e) => e.preventDefault()}
          onClick={onClick} aria-pressed={!!mine}>
          {mine ? <Emoji e={mine} play="once" /> : <Emoji e="🤍" play="static" />}
          <span>{mine ? reactionLabel(mine) : 'Thả cảm xúc'}</span>
        </button>
        <button type="button" className="reaction-more" onClick={() => setOpen((o) => !o)} aria-label="Chọn cảm xúc khác">
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

      {showPeople && like?.people?.length > 0 && (
        <ul className="reaction-people">
          {like.people.map((p, i) => (
            <li key={i}><Emoji e={p.reaction} play="static" /> {p.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
