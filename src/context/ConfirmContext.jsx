import { createContext, useCallback, useContext, useRef, useState } from 'react'
import Modal from '../components/Modal'
import { emojify } from '../components/Emoji'
import { tr } from '../lib/i18n'

/**
 * Hộp xác nhận riêng của web, thay cho window.confirm():
 * confirm() bị chặn (tự trả "Huỷ" mà không hiện gì) trong trình duyệt của Facebook/Zalo
 * và một số chế độ app → bấm "Xoá" không có tác dụng.
 *
 *   const confirm = useConfirm()
 *   if (!(await confirm('Xoá bình luận này?', { ok: 'Xoá', danger: true }))) return
 */
const ConfirmContext = createContext(async () => false)

export function ConfirmProvider({ children }) {
  const [ask, setAsk] = useState(null) // { message, ok, danger }
  const resolver = useRef(null)

  const confirm = useCallback((message, { ok = tr('Xác nhận'), danger = false } = {}) =>
    new Promise((resolve) => {
      resolver.current?.(false)
      resolver.current = resolve
      setAsk({ message, ok, danger })
    }), [])

  const answer = (value) => {
    resolver.current?.(value)
    resolver.current = null
    setAsk(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!ask} onClose={() => answer(false)}>
        <div className="confirm-box">
          <p>{emojify(ask?.message || '')}</p>
          <div className="row">
            <button className="btn" onClick={() => answer(false)}>{tr('Huỷ')}</button>
            <button className={`btn ${ask?.danger ? 'danger-fill' : 'primary'}`} onClick={() => answer(true)} autoFocus>{ask?.ok}</button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
