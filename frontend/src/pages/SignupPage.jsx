import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { HOME_ROUTE } from '../lib/routes'
import { errorMessage, fieldErrors } from '../api/client'
import { Alert, Button, Card, Field, Input } from '../components/ui'
import {
  RULES,
  runValidators,
  validateAddress,
  validateEmail,
  validateName,
  validatePassword,
} from '../lib/validation'

const EMPTY = { name: '', email: '', address: '', password: '' }

export default function SignupPage() {
  const { user, signup } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={HOME_ROUTE[user.role]} replace />

  const update = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }))
    // Clear a field's error as soon as the user edits it, so the form stops
    // scolding them while they are fixing it.
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const clientErrors = runValidators(values, {
      name: validateName,
      email: validateEmail,
      address: validateAddress,
      password: validatePassword,
    })
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setSubmitting(true)
    try {
      const created = await signup(values)
      navigate(HOME_ROUTE[created.role], { replace: true })
    } catch (err) {
      // Surface server-side field errors inline; anything else as a banner.
      const serverFields = fieldErrors(err)
      if (Object.keys(serverFields).length > 0) setErrors(serverFields)
      else setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const nameLength = values.name.trim().length

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Rate the stores you visit.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Alert>{formError}</Alert>

          <Field
            label="Name"
            error={errors.name}
            hint={`${nameLength}/${RULES.name.max} characters, minimum ${RULES.name.min}`}
          >
            <Input
              value={values.name}
              onChange={update('name')}
              error={errors.name}
              autoComplete="name"
              placeholder="Your full name"
              required
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={values.email}
              onChange={update('email')}
              error={errors.email}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field label="Address" error={errors.address}>
            <textarea
              value={values.address}
              onChange={update('address')}
              rows={2}
              maxLength={RULES.address.max}
              placeholder="Street, city, state, postcode"
              className={`w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 ${
                errors.address ? 'border-red-400' : 'border-slate-300 focus:border-slate-500'
              }`}
              required
            />
          </Field>

          <Field
            label="Password"
            error={errors.password}
            hint="8 to 16 characters, with an uppercase letter and a special character"
          >
            <Input
              type="password"
              value={values.password}
              onChange={update('password')}
              error={errors.password}
              autoComplete="new-password"
              placeholder="Create a password"
              required
            />
          </Field>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-slate-900 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  )
}
