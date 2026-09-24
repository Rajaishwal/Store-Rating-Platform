import axios from 'axios'

const TOKEN_KEY = 'srp.token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

/**
 * Requests go to a relative "/api" path. In development Vite proxies that to
 * the backend, so no API host is hard-coded into the client and the same build
 * works in production behind a reverse proxy.
 */
export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * A rejected request expires the stored session so the app cannot sit in a
 * state where it believes it is logged in but every call fails. Login and
 * signup are excluded: a 401 there means "wrong password", not "session over".
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? ''
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/signup')
    if (error.response?.status === 401 && !isAuthAttempt) {
      tokenStore.clear()
    }
    return Promise.reject(error)
  },
)

/**
 * Turns any axios failure into a string a form can display, whatever shape the
 * backend used: a validation list, a plain error, or a network failure.
 */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data
  if (Array.isArray(data?.details) && data.details.length > 0) {
    return data.details.map((d) => d.message).join('. ')
  }
  if (typeof data?.error === 'string') return data.error
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?'
  return fallback
}

/** Maps a backend validation response to { field: message } for inline display. */
export function fieldErrors(error) {
  const details = error?.response?.data?.details
  if (!Array.isArray(details)) return {}
  return details.reduce((acc, d) => {
    if (d.field && !acc[d.field]) acc[d.field] = d.message
    return acc
  }, {})
}
