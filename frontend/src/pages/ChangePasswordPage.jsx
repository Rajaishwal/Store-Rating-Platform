import { useState } from 'react'
import { api, errorMessage, fieldErrors } from '../api/client'
import { Alert, Button, Card, Field, Input } from '../components/ui'
import { runValidators, validatePassword } from '../lib/validation'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

/** Available to every signed-in role. */
export default function ChangePasswordPage() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setSuccess('')

    const clientErrors = runValidators(values, {
      currentPassword: (v) => (v ? null : 'Current password is required'),
      newPassword: validatePassword,
    })
    if (values.newPassword !== values.confirmPassword) {
      clientErrors.confirmPassword = 'Passwords do not match'
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.patch('/auth/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      setValues(EMPTY)
      setSuccess(data.message)
    } catch (err) {
      const serverFields = fieldErrors(err)
      if (Object.keys(serverFields).length > 0) setErrors(serverFields)
      else setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Update password</h1>
      <p className="mt-1 text-sm text-slate-600">
        You stay signed in on this device after changing it.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Alert>{formError}</Alert>
          <Alert kind="success">{success}</Alert>

          <Field label="Current password" error={errors.currentPassword}>
            <Input
              type="password"
              value={values.currentPassword}
              onChange={update('currentPassword')}
              error={errors.currentPassword}
              autoComplete="current-password"
              required
            />
          </Field>

          <Field
            label="New password"
            error={errors.newPassword}
            hint="8 to 16 characters, with an uppercase letter and a special character"
          >
            <Input
              type="password"
              value={values.newPassword}
              onChange={update('newPassword')}
              error={errors.newPassword}
              autoComplete="new-password"
              required
            />
          </Field>

          <Field label="Confirm new password" error={errors.confirmPassword}>
            <Input
              type="password"
              value={values.confirmPassword}
              onChange={update('confirmPassword')}
              error={errors.confirmPassword}
              autoComplete="new-password"
              required
            />
          </Field>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
