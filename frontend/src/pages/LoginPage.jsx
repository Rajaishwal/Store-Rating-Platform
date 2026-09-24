import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { HOME_ROUTE } from '../lib/routes'
import { errorMessage } from '../api/client'
import { Alert, Button, Card, Field, Input } from '../components/ui'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already signed in, so don't show the form again.
  if (user) return <Navigate to={HOME_ROUTE[user.role]} replace />

  const update = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const signedIn = await login(values.email, values.password)
      // Send them where they were originally headed, if that was a real page.
      const intended = location.state?.from
      navigate(intended && intended !== '/login' ? intended : HOME_ROUTE[signedIn.role], {
        replace: true,
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">Store Rating Platform</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Alert>{error}</Alert>

          <Field label="Email">
            <Input
              type="email"
              value={values.email}
              onChange={update('email')}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              value={values.password}
              onChange={update('password')}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </Field>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          No account?{' '}
          <Link to="/signup" className="font-medium text-slate-900 underline underline-offset-2">
            Create one
          </Link>
        </p>
      </Card>
    </main>
  )
}
