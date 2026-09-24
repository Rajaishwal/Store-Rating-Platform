import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, HOME_ROUTE } from '../context/AuthContext'
import { FullPageSpinner } from './ui'

/**
 * Gate for authenticated routes.
 *
 * This is a usability guard, not a security boundary — anyone can edit the
 * JavaScript that renders a page. Every protected route is independently
 * enforced on the server by `authenticate` and `authorize`.
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <FullPageSpinner label="Restoring your session…" />

  // Remember where they were headed so login can send them back.
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // Signed in but wrong role: send them to their own area rather than a
  // dead end, so a stale bookmark doesn't look like a broken app.
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={HOME_ROUTE[user.role]} replace />
  }

  return children
}
