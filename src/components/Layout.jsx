import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import { levelInfo, levelTitle, liveStreak } from '../lib/game'
import { useFriendships } from '../lib/friends'
import { useNotifications, notiIcon, notiText, personName } from '../lib/social'
import { useToast } from '../context/ToastContext'
import Emoji, { emojify } from './Emoji'
import { tr } from '../lib/i18n'

const TABS = [
  { to: '/journal', label: tr('Sổ hành trình'), icon: '📸' },
  { to: '/map', label: tr('Bản đồ'), icon: '🌏' },
  { to: '/', label: tr('Nhiệm vụ'), icon: '🎯', end: true },
  { to: '/events', label: tr('Thẻ & Quà'), icon: '🎁' },
  { to: '/me', label: tr('Tôi'), icon: null },
]

// Menu bên trái trên máy tính: thứ tự ưu tiên khác điện thoại + thêm các mục phụ
const SIDE_MAIN = [TABS[2], TABS[1], TABS[0], TABS[3]]
const SIDE_MORE = [
  { to: '/notifications', label: tr('Thông báo'), icon: '🔔', badge: 'unread' },
  { to: '/tours', label: tr('Tour theo chủ đề'), icon: '🧭' },
  { to: '/friends', label: tr('Bạn bè'), icon: '🤝', badge: 'pending' },
  { to: '/insights', label: tr('Thống kê trải nghiệm'), icon: '📊' },
  { to: '/partner', label: tr('Cổng đối tác'), icon: '🏪' },
  { to: '/settings', label: tr('Cài đặt'), icon: '⚙️' },
]

function SideLink({ to, label, icon, end, badge }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
      {({ isActive }) => (
        <>
          <Emoji e={icon} play={isActive ? 'loop' : 'hover'} />
          <span>{label}</span>
          {badge > 0 && <span className="badge static">{badge}</span>}
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const friendships = useFriendships(user.id)
  const pending = friendships.incoming.length
  // Thông báo mới tới (realtime): hiện toast, lời mời kết bạn thì tải lại danh sách bạn
  const notifications = useNotifications(user.id, (n) => {
    toast(`${notiIcon(n)} ${personName(n.actor)} ${notiText(n)}`)
    if (n.kind.startsWith('friend_')) friendships.reload()
  })
  const unread = notifications.unread
  const lv = levelInfo(profile?.xp || 0)
  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('/')}>
          <Logo size={42} />
          <span>
            <span className="brand-name">HANOI GO!</span>
            <span className="brand-sub">{tr('Hà Nội trong tầm tay')}</span>
          </span>
        </button>
        <nav className="side-nav">
          {SIDE_MAIN.map((t) => <SideLink key={t.to} {...t} />)}
          <div className="side-sep">{tr('Khám phá thêm')}</div>
          {SIDE_MORE.map((t) => <SideLink key={t.to} {...t} badge={{ pending, unread }[t.badge] || 0} />)}
          {profile?.is_admin && <SideLink to="/admin" label={tr('Trang quản trị')} icon="🛡️" />}
        </nav>
        <button className="side-profile" onClick={() => navigate('/me')}>
          <span className="side-avatar"><Emoji e={profile?.avatar || '🐢'} play="hover" /></span>
          <span className="side-profile-body">
            <strong>{profile?.display_name || profile?.username}</strong>
            <span className="muted small">Lv {lv.level} · {levelTitle(lv.level)}</span>
            <span className="side-stats">
              <span><Emoji e="🔥" play={liveStreak(profile) ? 'loop' : 'static'} /> {liveStreak(profile)}</span>
              <span><Emoji e="🪙" play="hover" /> {profile?.coins ?? '—'}</span>
            </span>
          </span>
        </button>
      </aside>
      <header className="topbar">
        <button className="brand" onClick={() => navigate('/')}>
          <Logo size={36} />
          <span>
            <span className="brand-name">HANOI GO!</span>
            <span className="brand-sub">{tr('Hà Nội trong tầm tay')}</span>
          </span>
        </button>
        <div className="topbar-right">
          <span className={`pill${liveStreak(profile) ? '' : ' dim'}`} title={tr('Chuỗi ngày hoạt động')}>
            <Emoji e="🔥" play={liveStreak(profile) ? 'loop' : 'static'} /> {liveStreak(profile)}
          </span>
          <span className="pill" title="Hanoi Coins"><Emoji e="🪙" play="hover" /> {profile?.coins ?? '—'}</span>
          <button className="icon-btn" onClick={() => navigate('/notifications')} aria-label={tr('Thông báo{0}', unread ? tr(', {0} chưa đọc', unread) : '')}>
            <Emoji e="🔔" play={unread > 0 ? 'loop' : 'hover'} />{unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          <button className="avatar-btn" onClick={() => navigate('/me')} aria-label={tr('Hồ sơ')}>
            <Emoji e={profile?.avatar || '🐢'} play="hover" />
          </button>
        </div>
      </header>
      <main className="content">
        <Suspense fallback={<div className="page"><div className="spinner" /></div>}>
          <Outlet context={{ ...friendships, notifications }} />
        </Suspense>
      </main>
      <nav className="bottomnav">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `navitem${isActive ? ' active' : ''}`}>
            {({ isActive }) => (
              <>
                <span className="navicon"><Emoji e={t.icon || profile?.avatar || '🐢'} play={isActive ? 'loop' : 'static'} /></span>
                <span className="navlabel">{emojify(t.label)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
