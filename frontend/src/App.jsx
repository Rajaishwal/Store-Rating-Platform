import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/auth-context'
import { HOME_ROUTE } from './lib/routes'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import StoresPage from './pages/StoresPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminStoresPage from './pages/admin/AdminStoresPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'
import NotFoundPage from './pages/NotFoundPage'

/** Sends "/" to the right place for whoever is signed in. */
function LandingRedirect() {
  const { user, initializing } = useAuth()
  if (initializing) return null
  return <Navigate to={user ? HOME_ROUTE[user.role] : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Every route below requires a session; AppLayout supplies the header. */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/account/password" element={<ChangePasswordPage />} />

        {/* The role guard wraps the whole admin area once, so a screen added
            underneath it cannot ship unprotected by accident. */}
        <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><Outlet /></ProtectedRoute>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="stores" element={<AdminStoresPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:userId" element={<AdminUserDetailPage />} />
        </Route>

        <Route
          path="/stores"
          element={
            <ProtectedRoute roles={['USER']}>
              <StoresPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/owner"
          element={
            <ProtectedRoute roles={['OWNER']}>
              <OwnerDashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/" element={<LandingRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
