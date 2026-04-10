import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/LoginPage'
import OverviewPage from './pages/admin/OverviewPage'
import UsersPage from './pages/admin/UsersPage'
import OrdersPage from './pages/admin/OrdersPage'
import BlockedUsersPage from './pages/admin/BlockedUsersPage'
import SettingsPage from './pages/admin/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="orders/pending" element={<OrdersPage key="orders-pending" completed={false} />} />
        <Route path="orders/completed" element={<OrdersPage key="orders-completed" completed={true} />} />
        <Route path="blocked" element={<BlockedUsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
