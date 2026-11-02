import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePush, useInstall } from '../lib/push'
import { friendlyError } from '../lib/supabase'
import Emoji from '../components/Emoji'
import LangSwitch from '../components/LangSwitch'
import ThemeSwitch from '../components/ThemeSwitch'
import { tr } from '../lib/i18n'

// Cài đặt: ngôn ngữ, giao diện Sáng / Tối / Theo máy, thông báo đẩy, cài app
export default function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const push = usePush(user.id)
  const app = useInstall()

  const togglePush = async () => {
    try {
      if (push.state === 'on') {
        await push.disable()
        toast(tr('Đã tắt thông báo đẩy trên thiết bị này'))
      } else {
        await push.enable()
        if (Notification.permission === 'granted') toast(tr('Đã bật! Bạn sẽ nhận thông báo kể cả khi đóng web.'), 'success')
      }
    } catch (e) {
      toast(friendlyError(e), 'error')
    }
  }

  const PUSH_NOTE = {
    on: tr('Đang bật trên thiết bị này.'),
    off: tr('Nhận thông báo khi bạn bè thả cảm xúc, bình luận, kết bạn — kể cả khi đã đóng web.'),
    denied: tr('Bạn đã chặn thông báo cho trang này. Hãy mở cài đặt trình duyệt để cho phép lại.'),
    'need-install': tr('Trên iPhone, hãy thêm HANOI GO! ra màn hình chính (mục bên dưới) rồi mở từ đó để bật thông báo.'),
    unsupported: tr('Trình duyệt này chưa hỗ trợ thông báo đẩy.'),
  }

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
        <div className="setting-row">
          <span className="setting-icon"><Emoji e="🔔" play="static" /></span>
          <div className="setting-text">
            <strong>{tr('Thông báo đẩy')}</strong>
            <span className="muted small">{PUSH_NOTE[push.state]}</span>
          </div>
          {(push.state === 'on' || push.state === 'off') && (
            <button className={`btn ${push.state === 'on' ? '' : 'primary'} setting-btn`} disabled={push.busy} onClick={togglePush}>
              {push.busy ? tr('Đang xử lý…') : push.state === 'on' ? tr('Tắt') : tr('Bật thông báo')}
            </button>
          )}
        </div>
        <div className="setting-row">
          <span className="setting-icon"><Emoji e="📲" play="static" /></span>
          <div className="setting-text">
            <strong>{tr('Cài HANOI GO! như app')}</strong>
            <span className="muted small">
              {app.installed ? tr('Bạn đang dùng bản đã cài. Tuyệt!')
                : app.canPrompt ? tr('Mở nhanh từ màn hình chính, toàn màn hình như một ứng dụng.')
                : app.ios ? tr('Trong Safari: bấm nút Chia sẻ (ô vuông có mũi tên) → "Thêm vào MH chính".')
                : tr('Mở menu trình duyệt → "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính".')}
            </span>
          </div>
          {!app.installed && app.canPrompt && (
            <button className="btn primary setting-btn" onClick={app.install}>{tr('Cài app')}</button>
          )}
        </div>
      </section>
    </div>
  )
}
