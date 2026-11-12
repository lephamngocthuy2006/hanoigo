import { Suspense, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import Icon from './Icon'
import PushInvite from './PushInvite'
import ErrorBoundary from './ErrorBoundary'
import { levelInfo, levelTitle, liveStreak } from '../lib/game'
import { useFriendships } from '../lib/friends'
import { useNotifications, notiIcon, notiLink, notiText, personName } from '../lib/social'
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

// Menu bên trái trên máy tính: icon nét mảnh trong ô màu (cùng bộ với menu trang Tôi).
// Thanh dưới cùng trên điện thoại vẫn giữ emoji động.
const SIDE_MAIN = [
  { to: '/', label: tr('Nhiệm vụ'), icon: 'target', tone: 'rose', end: true },
  { to: '/map', label: tr('Bản đồ'), icon: 'map', tone: 'teal' },
  { to: '/journal', label: tr('Sổ hành trình'), icon: 'journal', tone: 'amber' },
  { to: '/events', label: tr('Thẻ & Quà'), icon: 'gift', tone: 'plum' },
]
const SIDE_MORE = [
  { to: '/notifications', label: tr('Thông báo'), icon: 'bell', tone: 'gold', badge: 'unread' },
  { to: '/tours', label: tr('Tour theo chủ đề'), icon: 'compass', tone: 'teal' },
  { to: '/friends', label: tr('Bạn bè'), icon: 'users', tone: 'rose', badge: 'pending' },
  { to: '/insights', label: tr('Thống kê trải nghiệm'), icon: 'chart', tone: 'blue' },
  { to: '/partner', label: tr('Cổng đối tác'), icon: 'store', tone: 'amber' },
  { to: '/settings', label: tr('Cài đặt'), icon: 'settings', tone: 'slate' },
]

function SideLink({ to, label, icon, tone, end, badge }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
      <span className={`side-ico tone-${tone}`}><Icon name={icon} size={19} /></span>
      <span>{label}</span>
      {badge > 0 && <span className="badge static">{badge > 9 ? '9+' : badge}</span>}
    </NavLink>
  )
}

export default function Layout() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const friendships = useFriendships(user.id)
  const pending = friendships.incoming.length
  // Thông báo mới tới (realtime): hiện toast, lời mời kết bạn thì tải lại danh sách bạn
  const notifications = useNotifications(user.id, (n) => {
    toast(`${notiIcon(n)} ${personName(n.actor)} ${notiText(n)}`, 'info', { onClick: () => navigate(notiLink(n, user.id)) })
    if (n.kind.startsWith('friend_')) friendships.reload()
    if (n.kind === 'premium_granted') refreshProfile() // mở khoá Sổ hành trình ngay, không cần tải lại trang
  })
  const unread = notifications.unread

  // Sang trang mới thì về đầu trang (bấm Quay lại thì giữ nguyên vị trí)
  const location = useLocation()
  const navType = useNavigationType()
  const activeTab = TABS.findIndex((t) => (t.end ? location.pathname === t.to : location.pathname === t.to || location.pathname.startsWith(`${t.to}/`)))
  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0)
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
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
          {profile?.is_admin && <SideLink to="/admin" label={tr('Trang quản trị')} icon="shield" tone="plum" />}
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
          <button className={`icon-btn${unread > 0 ? ' ringing' : ''}`} onClick={() => navigate('/notifications')} aria-label={tr('Thông báo{0}', unread ? tr(', {0} chưa đọc', unread) : '')}>
            <Icon name="bell" size={19} />{unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          <button className="icon-btn" onClick={() => navigate('/settings')} aria-label={tr('Cài đặt')} title={tr('Cài đặt')}>
            <Icon name="settings" size={19} />
          </button>
          <button className="avatar-btn" onClick={() => navigate('/me')} aria-label={tr('Hồ sơ')}>
            <Emoji e={profile?.avatar || '🐢'} play="hover" />
          </button>
        </div>
      </header>
      <main className="content">
        <Suspense fallback={<div className="page"><div className="spinner" /></div>}>
          {/* key theo đường dẫn → mỗi lần đổi trang chạy lại hiệu ứng trượt vào */}
          <div key={location.pathname} className="page-enter">
            <ErrorBoundary>
              <Outlet context={{ ...friendships, notifications }} />
            </ErrorBoundary>
          </div>
        </Suspense>
      </main>
      <nav className="bottomnav">
        {/* viên nền trượt theo tab đang chọn (ẩn khi đang ở trang không thuộc 5 tab) */}
        {activeTab >= 0 && <span className="nav-pill" style={{ '--i': activeTab }} aria-hidden="true" />}
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
      <PushInvite userId={user.id} />
    </div>
  )
}
