/**
 * Client-side mirror of the server's rules, for instant feedback as the user
 * types. The authoritative copy lives in backend/src/validators/fields.js — if
 * a rule changes there, change it here too.
 *
 * These checks are a convenience only. The server re-validates everything.
 */

export const RULES = {
  name: { min: 20, max: 60 },
  address: { max: 400 },
  password: { min: 8, max: 16 },
}

export function validateName(value) {
  const trimmed = value.trim()
  if (trimmed.length < RULES.name.min) return `Name must be at least ${RULES.name.min} characters`
  if (trimmed.length > RULES.name.max) return `Name must be at most ${RULES.name.max} characters`
  return null
}

export function validateEmail(value) {
  if (!value.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address'
  return null
}

export function validateAddress(value) {
  const trimmed = value.trim()
  if (!trimmed) return 'Address is required'
  if (trimmed.length > RULES.address.max) return `Address must be at most ${RULES.address.max} characters`
  return null
}

export function validatePassword(value) {
  if (value.length < RULES.password.min) return `Password must be at least ${RULES.password.min} characters`
  if (value.length > RULES.password.max) return `Password must be at most ${RULES.password.max} characters`
  if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter'
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include at least one special character'
  return null
}

/** Runs a map of { field: validatorFn } and returns only the fields that failed. */
export function runValidators(values, validators) {
  const errors = {}
  for (const [field, validator] of Object.entries(validators)) {
    const message = validator(values[field] ?? '')
    if (message) errors[field] = message
  }
  return errors
}
