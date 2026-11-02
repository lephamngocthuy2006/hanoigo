import { useNavigate } from 'react-router-dom'
import Emoji from '../components/Emoji'
import LangSwitch from '../components/LangSwitch'
import ThemeSwitch from '../components/ThemeSwitch'
import { tr } from '../lib/i18n'

// Cài đặt: ngôn ngữ và giao diện Sáng / Tối / Theo máy
export default function SettingsPage() {
  const navigate = useNavigate()
  return (
    <div className="page narrow">
      <button className="ghost back" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/me', { replace: true }))}>{tr('← Quay lại')}</button>
      <header>
        <h1>{tr('Cài đặt')}</h1>
        <p className="muted small">{tr('Tuỳ chỉnh HANOI GO! theo cách bạn thích. Lựa chọn được lưu trên thiết bị này.')}</p>
      </header>

      <section className="card settings">
        <div className="setting-row">
          <span className="setting-icon"><Emoji e="🌐" play="static" /></span>
          <div className="setting-text">
            <strong>Ngôn ngữ · Language</strong>
            <span className="muted small">{tr('Đổi ngôn ngữ sẽ tải lại trang.')}</span>
          </div>
          <LangSwitch />
        </div>
        <div className="setting-row">
          <span className="setting-icon"><Emoji e="🌓" play="static" /></span>
          <div className="setting-text">
            <strong>{tr('Giao diện')}</strong>
            <span className="muted small">{tr('“Theo máy” tự đổi Sáng / Tối theo cài đặt của điện thoại hoặc máy tính.')}</span>
          </div>
          <ThemeSwitch />
        </div>
      </section>
    </div>
  )
}
