import { useEffect, useRef, useState } from 'react'
import { emojify } from './Emoji'
import { tr } from '../lib/i18n'

const CLOSE_MS = 220 // khớp với animation modal-out / sheet-down trong CSS

/**
 * Cửa sổ nổi. Trên điện thoại là bảng trượt từ dưới lên, có thanh nắm để vuốt xuống đóng.
 * Khi đóng vẫn giữ nội dung cũ thêm một nhịp để chạy hiệu ứng trượt xuống / mờ đi.
 */
export default function Modal({ open, onClose, children, title }) {
  const [shown, setShown] = useState(open)
  const [closing, setClosing] = useState(false)
  const last = useRef({ children, title })
  const sheetRef = useRef(null)
  const drag = useRef(null)
  if (open) last.current = { children, title }

  useEffect(() => {
    if (open) {
      setShown(true)
      setClosing(false)
      return
    }
    if (!shown) return
    setClosing(true)
    const t = setTimeout(() => { setShown(false); setClosing(false) }, CLOSE_MS)
    return () => clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Vuốt thanh nắm xuống để đóng (chỉ bảng trượt trên điện thoại)
  const onGrabStart = (e) => {
    if (!onClose) return
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0 }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    sheetRef.current.style.transition = 'none'
  }
  const onGrabMove = (e) => {
    if (!drag.current) return
    const dy = Math.max(0, e.clientY - drag.current.y)
    drag.current.dy = dy
    sheetRef.current.style.transform = `translateY(${dy}px)`
  }
  const onGrabEnd = (e) => {
    if (!drag.current) return
    const { dy, t } = drag.current
    drag.current = null
    const sheet = sheetRef.current
    sheet.style.transition = ''
    sheet.style.transform = ''
    if (dy > 110 || (dy > 40 && dy / Math.max(1, e.timeStamp - t) > 0.5)) {
      sheet.style.setProperty('--drag', `${dy}px`)
      onClose()
    }
  }

  if (!shown) return null
  const view = open ? { children, title } : last.current
  return (
    <div className={`modal-backdrop${closing ? ' closing' : ''}`} onClick={onClose}>
      <div ref={sheetRef} className="modal" role="dialog" aria-modal="true" aria-label={view.title} onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <div className="modal-grabber" onPointerDown={onGrabStart} onPointerMove={onGrabMove} onPointerUp={onGrabEnd} onPointerCancel={onGrabEnd} aria-hidden="true">
            <span />
          </div>
        )}
        {onClose && (
          <button className="modal-close" onClick={onClose} aria-label={tr('Đóng')}>✕</button>
        )}
        {view.title && <h3 className="modal-title">{emojify(view.title)}</h3>}
        {view.children}
      </div>
    </div>
  )
}
