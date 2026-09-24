import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth, HOME_ROUTE } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import StoresPage from './pages/StoresPage'
import ComingSoon from './pages/ComingSoon'

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

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <ComingSoon
                title="Administrator dashboard"
                phase="Phase 4"
                features={[
                  'Totals for users, stores, and submitted ratings',
                  'Store listing with name, email, address, and rating',
                  'User listing with name, email, address, and role',
                  'Filtering and sorting on every column',
                  'Create stores, normal users, and admin users',
                ]}
              />
            </ProtectedRoute>
          }
        />

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
              <ComingSoon
                title="Store owner dashboard"
                phase="Phase 5"
                features={[
                  'Average rating for your store',
                  'List of users who rated your store',
                ]}
              />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/" element={<LandingRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
