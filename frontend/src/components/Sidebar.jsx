import { NavLink } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { Home, Search, ListMusic, Clock, Sparkles, Music2, LogOut } from 'lucide-react'
import useAuthStore from '../store/useAuthStore'

const NAV = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/playlists', icon: ListMusic, label: 'Library' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/recommendations', icon: Sparkles, label: 'For You' },
]

export default function Sidebar() {
  const clearUser = useAuthStore((s) => s.clearUser)

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' })
    clearUser()
  }

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-40 transition-all duration-300"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--color-sidebar)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '14px 0 36px rgba(4, 15, 33, 0.35)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 lg:justify-start justify-center">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(140deg, #4f7dff 0%, #75a6ff 100%)', boxShadow: '0 10px 24px rgba(51, 93, 178, 0.45)' }}
        >
          <Music2 size={18} color="white" />
        </div>
        <span
          className="font-bold text-lg tracking-tight hidden lg:inline"
          style={{ color: 'white', letterSpacing: '-0.02em' }}
        >
          MuseStream
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        {NAV.map((item) => {
          const IconComponent = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 group lg:justify-start justify-center ${isActive ? 'sidebar-active' : 'sidebar-item'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'rgba(86, 126, 255, 0.18)' : 'transparent',
                color: isActive ? 'var(--color-sidebar-active)' : 'var(--color-sidebar-text)',
              })}
            >
              {({ isActive }) => (
                <>
                  <IconComponent
                    size={18}
                    style={{ color: isActive ? 'var(--color-sidebar-active)' : 'var(--color-sidebar-text)' }}
                    className="flex-shrink-0 transition-colors duration-200"
                  />
                  <span className="text-sm font-medium hidden lg:inline">{item.label}</span>
                  {isActive && (
                    <Motion.div
                      layoutId="sidebar-indicator"
                      className="ml-auto w-1 h-4 rounded-full hidden lg:block"
                      style={{ background: '#91b0ff' }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 lg:justify-start justify-center"
          style={{ color: 'var(--color-sidebar-text)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#e85d75')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-sidebar-text)')}
        >
          <LogOut size={18} />
          <span className="text-sm font-medium hidden lg:inline">Log out</span>
        </button>
      </div>
    </aside>
  )
}
