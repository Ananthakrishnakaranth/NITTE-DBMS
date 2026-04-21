import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/useAuthStore'
import Sidebar from './components/Sidebar'
import PlayerBar from './components/PlayerBar'
import Auth from './pages/Auth'
import Onboard from './pages/Onboard'
import Home from './pages/Home'
import Search from './pages/Search'
import Recommendations from './pages/Recommendations'
import Playlists from './pages/Playlists'
import History from './pages/History'

function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user && !user.onboarding_complete) return <Navigate to="/onboard" replace />
  return children
}

function AppShell({ children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(165deg, var(--color-bg) 0%, var(--color-bg-deep) 100%)' }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto pb-24"
        style={{ marginLeft: 'var(--sidebar-width)' }}
        id="main-content"
      >
        {children}
      </main>
      <PlayerBar />
    </div>
  )
}

export default function App() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const clearUser = useAuthStore((s) => s.clearUser)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let ignore = false

    const bootstrapAuth = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' })
        const data = await res.json()
        if (ignore) return

        if (data?.user) setUser(data.user)
        else clearUser()
      } catch {
        if (!ignore) clearUser()
      } finally {
        if (!ignore) setAuthReady(true)
      }
    }

    bootstrapAuth()
    return () => {
      ignore = true
    }
  }, [setUser, clearUser])

  if (!authReady) {
    return (
      <div className="h-screen grid place-items-center" style={{ background: 'linear-gradient(165deg, var(--color-bg) 0%, var(--color-bg-deep) 100%)', color: 'var(--color-muted)' }}>
        <p className="text-sm">Preparing your library...</p>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Auth />} />
      <Route path="/register" element={user ? <Navigate to="/home" replace /> : <Auth initialTab="register" />} />
      <Route
        path="/onboard"
        element={
          !user ? <Navigate to="/login" replace /> : <Onboard />
        }
      />

      {/* Protected app routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <AppShell><Home /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <AppShell><Search /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recommendations"
        element={
          <ProtectedRoute>
            <AppShell><Recommendations /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/playlists"
        element={
          <ProtectedRoute>
            <AppShell><Playlists /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AppShell><History /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
    </Routes>
  )
}
