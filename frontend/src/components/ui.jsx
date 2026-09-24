/** Small shared primitives so every form and page looks the same. */

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  )
}

export function Input({ error, className = '', ...props }) {
  return (
    <input
      {...props}
      aria-invalid={Boolean(error)}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition
        placeholder:text-slate-400
        focus:ring-2 focus:ring-slate-900/10
        ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-slate-500'}
        ${className}`}
    />
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  }
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition
        disabled:cursor-not-allowed disabled:opacity-70 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
  return (
    <div role="alert" className={`rounded-lg border px-3 py-2 text-sm ${styles[kind]}`}>
      {children}
    </div>
  )
}

export function FullPageSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}
