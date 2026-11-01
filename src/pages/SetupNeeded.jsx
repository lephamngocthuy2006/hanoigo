import Emoji from '../components/Emoji'
import { tr } from '../lib/i18n'

export default function SetupNeeded() {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h2><Emoji e="⚙️" play="static" />{tr(' Chưa cấu hình Supabase')}</h2>
        <p className="muted">{tr('Tạo file ')}<code>.env</code>{tr(' (khi chạy trên máy) hoặc thêm GitHub Secrets (khi deploy) với hai biến')}<code> VITE_SUPABASE_URL</code>{tr(' và ')}<code>VITE_SUPABASE_ANON_KEY</code>{tr('. Xem hướng dẫn trong README.md.')}</p>
      </div>
    </div>
  )
}
