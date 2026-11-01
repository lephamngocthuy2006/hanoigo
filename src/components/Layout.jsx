import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import { liveStreak } from '../lib/game'

const TABS = [
  { to: '/journal', label: 'Sổ hành trình', icon: '📖' },
  { to: '/map', label: 'Bản đồ', icon: '🗺️' },
  { to: '/', label: 'Nhiệm vụ', icon: '🎮', end: true },
  { to: '/events', label: 'Thẻ & Quà', icon: '🎴' },
  { to: '/me', label: 'Tôi', icon: '🐢' },
]

export default function Layout() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('/')}>
          <Logo size={36} />
          <span>
            <span className="brand-name">HANOI GO!</span>
            <span className="brand-sub">Hà Nội trong tầm tay</span>
          </span>
        </button>
        <div className="topbar-right">
          <span className="pill" title="Chuỗi ngày hoạt động">🔥 {liveStreak(profile)}</span>
          <span className="pill" title="Hanoi Coins">🪙 {profile?.coins ?? '—'}</span>
          <button className="avatar-btn" onClick={() => navigate('/me')} aria-label="Hồ sơ">
            {profile?.avatar || '🐢'}
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <nav className="bottomnav">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `navitem${isActive ? ' active' : ''}`}>
            <span className="navicon">{t.icon}</span>
            <span className="navlabel">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
