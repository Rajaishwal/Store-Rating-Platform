import { useEffect } from 'react'

/** Dialog used by the admin "add" forms. */
export default function Modal({ open, title, description, onClose, children }) {
  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!open) return undefined

    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center">
      {/* Clicking the backdrop closes; clicks inside the panel must not bubble to it. */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative my-8 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            &times;
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}
