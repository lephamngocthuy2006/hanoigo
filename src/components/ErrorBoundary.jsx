import { Component } from 'react'
import Emoji from './Emoji'
import { tr } from '../lib/i18n'

// Lỗi khi tải phần trang được tách riêng (Thống kê, Đối tác, Quản trị) sau khi web vừa cập nhật:
// tab đang mở còn trỏ tới file cũ đã bị thay → tải lại trang là xong.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch dynamically/i
const RELOAD_KEY = 'hanoigo-reloaded-at'

export function reloadOnceForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < 30000) return false // vừa tải lại rồi → không lặp vô hạn
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch { /* chế độ ẩn danh: vẫn tải lại */ }
  window.location.reload()
  return true
}

/**
 * Bắt lỗi hiển thị: thay vì cả trang trắng xoá, hiện thông báo + nút tải lại.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (CHUNK_ERROR.test(error?.message || '')) reloadOnceForNewVersion()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page narrow crash-page">
        <div className="card empty">
          <div className="empty-emoji" aria-hidden="true"><Emoji e="🧭" play="static" /></div>
          <h2>{tr('Ối, có chút trục trặc')}</h2>
          <p className="muted">{tr('Có thể web vừa được cập nhật. Tải lại trang để tiếp tục nhé!')}</p>
          <button className="btn primary" onClick={() => window.location.reload()}>{tr('Tải lại trang')}</button>
        </div>
      </div>
    )
  }
}
