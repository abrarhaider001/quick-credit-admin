import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export function ProtectedRoute({ children }) {
  const { user, isAdmin, initialized } = useAuth()
  const location = useLocation()

  if (!initialized) {
    return (
      <div className="screen-fill screen-fill--loading" aria-busy="true">
        <div className="brand-mark brand-mark--lg" aria-hidden="true" />
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          message: user && !isAdmin ? 'Admin access required for this app.' : null,
        }}
      />
    )
  }

  return children
}
