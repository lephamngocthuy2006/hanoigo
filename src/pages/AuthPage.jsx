import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../lib/supabase'
import Logo from '../components/Logo'
import LangSwitch from '../components/LangSwitch'
import { tr } from '../lib/i18n'

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
    if (!isLogin && form.password !== form.confirm) return setError(tr('Mật khẩu nhập lại không khớp'))
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
        <Logo size={104} />
        <h1 className="brand-name big">HANOI GO!</h1>
        <p>{tr('Chơi cùng thành phố — khám phá Hà Nội qua từng nhiệm vụ.')}</p>
        <LangSwitch className="auth-lang" />
      </div>
      <form className="card auth-card" onSubmit={submit}>
        <h2>{isLogin ? tr('Đăng nhập') : tr('Tạo tài khoản')}</h2>
        <label className="field">
          <span>{tr('Tên đăng nhập')}</span>
          <input value={form.username} onChange={set('username')} autoComplete="username" autoCapitalize="none"
            placeholder={tr('vd: ngocthuy2006')} required minLength={3} maxLength={20} />
          {!isLogin && <small className="muted">{tr('3–20 ký tự: chữ thường không dấu, số, dấu _')}</small>}
        </label>
        {!isLogin && (
          <label className="field">
            <span>{tr('Tên hiển thị')}</span>
            <input value={form.displayName} onChange={set('displayName')} placeholder={tr('vd: Linh Nguyễn')} maxLength={40} />
          </label>
        )}
        <label className="field">
          <span>{tr('Mật khẩu')}</span>
          <div className="pw-row">
            <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
              autoComplete={isLogin ? 'current-password' : 'new-password'} required minLength={6} />
            <button type="button" className="ghost small" onClick={() => setShowPw(!showPw)}>{showPw ? tr('Ẩn') : tr('Hiện')}</button>
          </div>
        </label>
        {!isLogin && (
          <label className="field">
            <span>{tr('Nhập lại mật khẩu')}</span>
            <input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required minLength={6} />
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <button className="btn primary block" disabled={busy}>
          {busy ? tr('Đang xử lý…') : isLogin ? tr('Đăng nhập') : tr('Đăng ký & bắt đầu')}
        </button>
        <p className="center muted">
          {isLogin ? <>{tr('Chưa có tài khoản? ')}<Link to="/register" state={location.state}>{tr('Đăng ký')}</Link></> : <>{tr('Đã có tài khoản? ')}<Link to="/login" state={location.state}>{tr('Đăng nhập')}</Link></>}
        </p>
      </form>
    </div>
  )
}
