import { Navigate, Route, Routes } from 'react-router-dom'
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

export default function App() {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<QuestsPage />} />
        <Route path="/quest/:id" element={<QuestDetail />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/me" element={<MePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
