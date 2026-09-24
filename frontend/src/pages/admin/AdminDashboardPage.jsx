import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../../api/client'
import { Alert, Card } from '../../components/ui'

/**
 * A handful of headline numbers is a KPI row of stat tiles, not a chart — three
 * independent totals share no scale, so a bar chart would invite a comparison
 * that means nothing.
 *
 * The value uses the font's default proportional figures deliberately. Tabular
 * figures give every digit the width of a zero, which makes a number like 121
 * look loose at display size; they belong in table columns that must align
 * vertically, not on a standalone figure.
 */
function StatTile({ label, value, loading, to, caption }) {
  const body = (
    <>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
        {loading ? <span className="text-slate-300">&mdash;</span> : value.toLocaleString()}
      </p>
      {caption && <p className="mt-1 text-xs text-slate-500">{caption}</p>}
    </>
  )

  if (!to) return <Card className="p-6">{body}</Card>

  return (
    <Link
      to={to}
      className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition
        hover:border-slate-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
    >
      {body}
    </Link>
  )
}

export default function AdminDashboardPage() {
  const [totals, setTotals] = useState({ users: 0, stores: 0, ratings: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data } = await api.get('/admin/dashboard')
        if (!cancelled) setTotals(data.totals)
      } catch (err) {
        if (!cancelled) setError(errorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">Platform totals across all accounts and stores.</p>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Total users"
          value={totals.users}
          loading={loading}
          to="/admin/users"
          caption="Administrators, normal users and store owners"
        />
        <StatTile
          label="Total stores"
          value={totals.stores}
          loading={loading}
          to="/admin/stores"
          caption="Registered on the platform"
        />
        <StatTile
          label="Submitted ratings"
          value={totals.ratings}
          loading={loading}
          caption="One per user per store"
        />
      </div>
    </div>
  )
}
