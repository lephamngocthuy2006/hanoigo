import { createContext, useCallback, useContext, useState } from 'react'
import { emojify } from '../components/Emoji'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  // onClick: bấm vào toast để mở (ví dụ thông báo mới → mở đúng bài); bấm xong toast tự tắt
  const toast = useCallback((text, type = 'info', { onClick } = {}) => {
    const id = Math.random()
    setToasts((t) => [...t, { id, text, type, onClick }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), onClick ? 5000 : 3500)
  }, [])
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id))
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          t.onClick ? (
            <button key={t.id} type="button" className={`toast toast-${t.type} toast-link`} onClick={() => { dismiss(t.id); t.onClick() }}>
              {emojify(t.text)}<span className="toast-go" aria-hidden="true">›</span>
            </button>
          ) : (
            <div key={t.id} className={`toast toast-${t.type}`}>{emojify(t.text)}</div>
          )
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
