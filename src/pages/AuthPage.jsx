import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/supabase'
import Logo from '../components/Logo'

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  const location = useLocation()
  const { signIn, signUp } = useAuth()
  const [form, setForm] = useState({ username: '', password: '', confirm: '', displayName: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: k === 'username' ? e.target.value.toLowerCase().replace(/\s/g, '') : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!isLogin && form.password !== form.confirm) return setError('Mật khẩu nhập lại không khớp')
    setBusy(true)
    try {
      if (isLogin) await signIn(form)
      else await signUp(form)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <Logo size={64} />
        <h1 className="brand-name big">HANOI GO!</h1>
        <p>Chơi cùng thành phố — khám phá Hà Nội qua từng nhiệm vụ.</p>
      </div>
      <form className="card auth-card" onSubmit={submit}>
        <h2>{isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
        <label className="field">
          <span>Tên đăng nhập</span>
          <input value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="none"
            placeholder="vd: linh_2004" required minLength={3} maxLength={20} />
          {!isLogin && <small className="muted">3–20 ký tự: chữ thường không dấu, số, dấu _</small>}
        </label>
        {!isLogin && (
          <label className="field">
            <span>Tên hiển thị</span>
            <input value={form.displayName} onChange={set('displayName')} placeholder="vd: Linh Nguyễn" maxLength={40} />
          </label>
        )}
        <label className="field">
          <span>Mật khẩu</span>
          <div className="pw-row">
            <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
              autoComplete={isLogin ? 'current-password' : 'new-password'} required minLength={6} />
            <button type="button" className="ghost small" onClick={() => setShowPw(!showPw)}>{showPw ? 'Ẩn' : 'Hiện'}</button>
          </div>
        </label>
        {!isLogin && (
          <label className="field">
            <span>Nhập lại mật khẩu</span>
            <input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required minLength={6} />
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Đang xử lý…' : isLogin ? 'Đăng nhập' : 'Đăng ký & bắt đầu'}
        </button>
        <p className="center muted">
          {isLogin ? <>Chưa có tài khoản? <Link to="/register" state={location.state}>Đăng ký</Link></> : <>Đã có tài khoản? <Link to="/login" state={location.state}>Đăng nhập</Link></>}
        </p>
      </form>
    </div>
  )
}
