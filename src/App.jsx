import { lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'
import QuestsPage from './pages/QuestsPage'
import QuestDetail from './pages/QuestDetail'
import MapPage from './pages/MapPage'
import JournalPage from './pages/JournalPage'
import EventsPage from './pages/EventsPage'
import MePage from './pages/MePage'
import Splash from './components/Splash'
import SitePaused from './components/SitePaused'
import { useSiteStatus } from './lib/site'
import FriendsPage from './pages/FriendsPage'
import FriendProfile from './pages/FriendProfile'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage from './pages/SettingsPage'
import ScanPage from './pages/ScanPage'
import CertPage from './pages/CertPage'
import ToursPage from './pages/ToursPage'
import TourDetail from './pages/TourDetail'

const InsightsPage = lazy(() => import('./pages/InsightsPage'))
const PartnerPage = lazy(() => import('./pages/PartnerPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

export default function App() {
  const { session, profile, loading } = useAuth()
  const location = useLocation()
  const site = useSiteStatus()
  if (loading || site.loading) return <Splash />

  // Chủ web đã tạm ngưng web: ai cũng chỉ thấy trang thông báo, riêng chủ web vẫn dùng bình thường.
  // Trang thông báo không có nút đăng nhập — chủ web gõ thẳng .../#/login
  if (site.status.paused && !profile?.is_owner) {
    if (!session) {
      return (
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="*" element={<SitePaused mode="guest" />} />
        </Routes>
      )
    }
    // vừa đăng nhập, hồ sơ chưa tải xong → chờ (có thể là chủ web)
    if (!profile) return <Splash />
    return <SitePaused mode="user" />
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/cert/:code" element={<CertPage />} />
        <Route path="*" element={<Navigate to="/login" state={{ from: location }} replace />} />
      </Routes>
    )
  }
  const from = location.state?.from
  const backTo = from?.pathname && !['/login', '/register', '/'].includes(from.pathname)
    ? { pathname: from.pathname, search: from.search || '' }
    : '/'
  const backState = backTo !== '/' ? from.state : undefined

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<QuestsPage />} />
        <Route path="/quest/:id" element={<QuestDetail />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/tours" element={<ToursPage />} />
        <Route path="/tour/:id" element={<TourDetail />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/partner" element={<PartnerPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/u/:username" element={<FriendProfile />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/scan/:token" element={<ScanPage />} />
        <Route path="/cert/:code" element={<CertPage signedIn />} />
      </Route>
      {profile?.is_owner && <Route path="/paused-preview" element={<SitePaused mode="preview" />} />}
      <Route path="*" element={<Navigate to={backTo} state={backState} replace />} />
    </Routes>
  )
}
