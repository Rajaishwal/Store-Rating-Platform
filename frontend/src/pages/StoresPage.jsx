import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { useDebounced } from '../hooks/useDebounced'
import { StarDisplay, StarRating } from '../components/StarRating'
import { Alert, Button, Card, Input } from '../components/ui'

const PAGE_SIZE = 10

/** Column header that toggles between ascending and descending. */
function SortableHeader({ column, label, sort, onSort, className = '' }) {
  const active = sort.by === column
  const arrow = active ? (sort.order === 'asc' ? '↑' : '↓') : '↕'

  return (
    <th scope="col" className={`px-4 py-3 text-left ${className}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition
          ${active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
      >
        {label}
        <span aria-hidden="true" className={active ? 'text-slate-900' : 'text-slate-400'}>
          {arrow}
        </span>
      </button>
    </th>
  )
}

export default function StoresPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)
  const [sort, setSort] = useState({ by: 'name', order: 'asc' })
  const [page, setPage] = useState(1)

  const [stores, setStores] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Which store is mid-save, so only that row's stars are disabled.
  const [savingId, setSavingId] = useState(null)

  const loadStores = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/stores', {
        params: {
          search: debouncedSearch || undefined,
          sortBy: sort.by,
          order: sort.order,
          page,
          limit: PAGE_SIZE,
        },
      })
      setStores(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(errorMessage(err))
      setStores([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, sort.by, sort.order, page])

  useEffect(() => {
    loadStores()
  }, [loadStores])

  // A new search or sort invalidates the current page number: page 3 of the
  // old result set is meaningless against the new one.
  function handleSearchChange(event) {
    setSearch(event.target.value)
    setPage(1)
  }

  function handleSort(column) {
    setSort((current) =>
      current.by === column
        ? { by: column, order: current.order === 'asc' ? 'desc' : 'asc' }
        : { by: column, order: 'asc' },
    )
    setPage(1)
  }

  async function handleRate(storeId, value) {
    setSavingId(storeId)
    setError('')
    try {
      const { data } = await api.put(`/stores/${storeId}/rating`, { value })
      // Patch the one row from the server's response rather than refetching
      // the list: a refetch would reorder rows under the user's cursor when
      // sorted by rating.
      setStores((current) =>
        current.map((store) =>
          store.id === storeId
            ? {
                ...store,
                myRating: data.myRating,
                overallRating: data.overallRating,
                ratingCount: data.ratingCount,
              }
            : store,
        ),
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingId(null)
    }
  }

  const totalPages = pagination?.totalPages ?? 1

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stores</h1>
          <p className="mt-1 text-sm text-slate-600">
            Rate any store from 1 to 5. Click a different star to change a rating you already gave.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name or address"
            aria-label="Search stores by name or address"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <SortableHeader column="name" label="Store" sort={sort} onSort={handleSort} />
                <SortableHeader column="address" label="Address" sort={sort} onSort={handleSort} />
                <SortableHeader
                  column="rating"
                  label="Overall rating"
                  sort={sort}
                  onSort={handleSort}
                />
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Your rating
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                    Loading stores...
                  </td>
                </tr>
              )}

              {!loading && stores.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                    {debouncedSearch
                      ? `No stores match "${debouncedSearch}".`
                      : 'No stores have been registered yet.'}
                  </td>
                </tr>
              )}

              {!loading &&
                stores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{store.name}</p>
                      <p className="text-xs text-slate-500">{store.email}</p>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-sm text-slate-600">{store.address}</td>
                    <td className="px-4 py-3">
                      <StarDisplay value={store.overallRating} count={store.ratingCount} />
                    </td>
                    <td className="px-4 py-3">
                      <StarRating
                        value={store.myRating}
                        disabled={savingId === store.id}
                        onRate={(value) => handleRate(store.id, value)}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {pagination && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Page {pagination.page} of {totalPages} &middot; {pagination.total} stores
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5"
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
