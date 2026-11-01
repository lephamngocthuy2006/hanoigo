import { useEffect } from 'react'
import { emojify } from './Emoji'

export default function Modal({ open, onClose, children, title }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button className="modal-close" onClick={onClose} aria-label="Đóng">✕</button>
        )}
        {title && <h3 className="modal-title">{emojify(title)}</h3>}
        {children}
      </div>
    </div>
  )
}
