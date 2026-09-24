import { useState } from 'react'

const STARS = [1, 2, 3, 4, 5]

function Star({ filled, className = '' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-5 w-5 ${filled ? 'text-amber-400' : 'text-slate-300'} ${className}`}
      fill="currentColor"
    >
      <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9 4.8 17.6l1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
    </svg>
  )
}

/** Read-only display: stars plus the numeric average. */
export function StarDisplay({ value, count }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-slate-400">No ratings yet</span>
  }
  const rounded = Math.round(value)
  return (
    <span className="flex items-center gap-2">
      <span className="flex" aria-hidden="true">
        {STARS.map((star) => (
          <Star key={star} filled={star <= rounded} />
        ))}
      </span>
      <span className="text-sm font-medium tabular-nums">{value.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-xs text-slate-500">
          ({count} {count === 1 ? 'rating' : 'ratings'})
        </span>
      )}
      <span className="sr-only">{value.toFixed(1)} out of 5</span>
    </span>
  )
}

/**
 * Interactive rating input.
 *
 * Rendered as real buttons rather than a div with a click handler, so it is
 * reachable by keyboard and announced correctly by a screen reader.
 */
export function StarRating({ value, onRate, disabled = false }) {
  const [hovered, setHovered] = useState(null)
  const shown = hovered ?? value ?? 0

  return (
    <span className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      <span className="flex">
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
            onClick={() => onRate(star)}
            aria-label={`Rate ${star} out of 5`}
            aria-pressed={value === star}
            className="rounded p-0.5 transition disabled:cursor-not-allowed disabled:opacity-50
              focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30"
          >
            <Star filled={star <= shown} className={disabled ? '' : 'hover:scale-110'} />
          </button>
        ))}
      </span>
      {value ? (
        <span className="ml-1 text-xs text-slate-500">your rating</span>
      ) : (
        <span className="ml-1 text-xs text-slate-400">not rated</span>
      )}
    </span>
  )
}
