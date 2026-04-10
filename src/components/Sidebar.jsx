import { NavLink } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'

const NAV = [
  { to: '/dashboard/overview', label: 'Overview', end: false },
  { to: '/dashboard/users', label: 'Users' },
  { to: '/dashboard/orders/pending', label: 'Pending orders' },
  { to: '/dashboard/orders/completed', label: 'Completed orders' },
  { to: '/dashboard/blocked', label: 'Blocked users' },
  { to: '/dashboard/settings', label: 'Settings' },
]

export function Sidebar({ open, onClose }) {
  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop ${open ? 'sidebar-backdrop--visible' : ''}`}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className={`admin-sidebar ${open ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__brand">
          <BrandLogo decorative className="admin-sidebar__logo" />
          <div>
            <span className="admin-sidebar__name">QuickCredit</span>
            <span className="admin-sidebar__badge">Admin</span>
          </div>
        </div>
        <nav className="admin-sidebar__nav" aria-label="Main">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `admin-sidebar__link${isActive ? ' admin-sidebar__link--active' : ''}`
              }
              onClick={onClose}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
