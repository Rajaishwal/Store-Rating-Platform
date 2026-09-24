import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import DataTable, { Pagination } from '../components/DataTable'
import { StarDisplay } from '../components/StarRating'
import { Alert, Card } from '../components/ui'

const PAGE_SIZE = 10

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export default function OwnerDashboardPage() {
  const [sort, setSort] = useState({ by: 'ratedAt', order: 'desc' })
  const [page, setPage] = useState(1)

  const [store, setStore] = useState(null)
  const [summary, setSummary] = useState({ averageRating: null, ratingCount: 0 })
  const [raters, setRaters] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/owner/dashboard', {
        params: { sortBy: sort.by, order: sort.order, page, limit: PAGE_SIZE },
      })
      setStore(data.store)
      setSummary(data.summary)
      setRaters(data.raters)
      setPagination(data.pagination)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [sort.by, sort.order, page])

  useEffect(() => {
    load()
  }, [load])

  function handleSort(column) {
    setSort((current) =>
      current.by === column
        ? { by: column, order: current.order === 'asc' ? 'desc' : 'asc' }
        : { by: column, order: 'asc' },
    )
    setPage(1)
  }

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      sortable: true,
      render: (row) => <span className="font-medium">{row.user.name}</span>,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      className: 'text-slate-600',
      render: (row) => row.user.email,
    },
    {
      key: 'address',
      label: 'Address',
      sortable: true,
      className: 'text-slate-600',
      render: (row) => row.user.address,
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (row) => <StarDisplay value={row.value} />,
    },
    {
      key: 'ratedAt',
      label: 'Rated on',
      sortable: true,
      className: 'whitespace-nowrap text-slate-600',
      render: (row) => dateFormat.format(new Date(row.ratedAt)),
    },
  ]

  // An owner account can exist before a store is assigned to it. That is a
  // normal state, not an error, so it gets an explanation rather than a blank
  // dashboard or a failure message.
  if (!loading && !error && store === null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Card className="mt-6 p-8 text-center">
          <p className="font-medium">No store assigned yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Your account is registered as a store owner, but no store has been linked to it. An
            administrator can assign one, and your ratings will appear here once customers start
            leaving them.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {store ? store.name : 'Dashboard'}
      </h1>
      {store && <p className="mt-1 text-sm text-slate-600">{store.address}</p>}

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm text-slate-600">Average rating</p>
          {summary.averageRating === null ? (
            <p className="mt-2 text-lg text-slate-400">No ratings yet</p>
          ) : (
            <>
              {/* Proportional figures, not tabular: equal-width digits make a
                  large standalone number look loose. */}
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {summary.averageRating.toFixed(1)}
                <span className="ml-1 text-xl font-normal text-slate-400">/ 5</span>
              </p>
              <div className="mt-2">
                <StarDisplay value={summary.averageRating} />
              </div>
            </>
          )}
        </Card>

        <Card className="p-6">
          <p className="text-sm text-slate-600">Ratings received</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">{summary.ratingCount}</p>
          <p className="mt-1 text-xs text-slate-500">One per customer</p>
        </Card>
      </div>

      <h2 className="mt-8 text-lg font-semibold tracking-tight">Who rated your store</h2>
      <div className="mt-3">
        <DataTable
          columns={columns}
          rows={raters}
          rowKey={(row) => row.ratingId}
          sort={sort}
          onSort={handleSort}
          loading={loading}
          emptyMessage="Nobody has rated your store yet."
        />
      </div>

      <Pagination pagination={pagination} onPage={setPage} noun="ratings" />
    </div>
  )
}
