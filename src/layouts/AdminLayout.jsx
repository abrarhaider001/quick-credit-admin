import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Sidebar } from '../components/Sidebar'
import '../styles/admin.css'

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="admin-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-btn"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <span className="admin-menu-icon" />
          </button>
          <div className="admin-topbar__spacer" />
          <span className="admin-topbar__email muted">{user?.email}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => signOut()}>
            Sign out
          </button>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
