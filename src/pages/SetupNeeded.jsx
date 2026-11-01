export default function SetupNeeded() {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h2>⚙️ Chưa cấu hình Supabase</h2>
        <p className="muted">
          Tạo file <code>.env</code> (khi chạy trên máy) hoặc thêm GitHub Secrets (khi deploy) với hai biến
          <code> VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code>. Xem hướng dẫn trong README.md.
        </p>
      </div>
    </div>
  )
}
