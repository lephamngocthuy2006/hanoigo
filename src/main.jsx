import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import './lib/theme'
import { registerServiceWorker } from './lib/push'
import App from './App'
import { isConfigured } from './lib/supabase'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import SetupNeeded from './pages/SetupNeeded'
import ErrorBoundary, { reloadOnceForNewVersion } from './components/ErrorBoundary'

registerServiceWorker()

// Web vừa cập nhật mà tab cũ còn mở: phần trang tải sau (lazy) không còn file cũ → tải lại trang một lần
window.addEventListener('vite:preloadError', (e) => {
  if (reloadOnceForNewVersion()) e.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isConfigured ? (
      <HashRouter>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </HashRouter>
    ) : (
      <SetupNeeded />
    )}
  </React.StrictMode>,
)
