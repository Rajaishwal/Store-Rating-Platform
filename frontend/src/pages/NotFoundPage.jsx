import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { HOME_ROUTE } from '../lib/routes'
import { Card, FullPageSpinner } from '../components/ui'

/**
 * Shown for an unknown URL.
 *
 * Previously this route redirected silently to "/", which made a typo or a
 * stale bookmark look like the app had quietly ignored the request. Saying so
 * plainly, and offering the way back, is more honest and easier to recover
 * from.
 */
export default function NotFoundPage() {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <FullPageSpinner />

  // Nobody is signed in, so there is nothing useful to offer but the login
  // page; sending them there directly saves a pointless extra click.
  if (!user) return <Navigate to="/login" replace />

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nothing exists at <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{location.pathname}</code>.
          It may have moved, or the link may be out of date.
        </p>
        <Link
          to={HOME_ROUTE[user.role]}
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium
            text-white transition hover:bg-slate-700"
        >
          Back to your dashboard
        </Link>
      </Card>
    </main>
  )
}
