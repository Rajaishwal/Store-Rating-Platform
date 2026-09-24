import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import { useDebounced } from '../hooks/useDebounced'
import DataTable, { Pagination } from '../components/DataTable'
import { StarDisplay, StarRating } from '../components/StarRating'
import { Alert, Input } from '../components/ui'

const PAGE_SIZE = 10

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

  const columns = [
    {
      key: 'name',
      label: 'Store',
      sortable: true,
      render: (store) => (
        <>
          <p className="font-medium">{store.name}</p>
          <p className="text-xs text-slate-500">{store.email}</p>
        </>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      sortable: true,
      className: 'max-w-xs text-slate-600',
    },
    {
      key: 'rating',
      label: 'Overall rating',
      sortable: true,
      render: (store) => <StarDisplay value={store.overallRating} count={store.ratingCount} />,
    },
    {
      key: 'myRating',
      label: 'Your rating',
      render: (store) => (
        <StarRating
          value={store.myRating}
          disabled={savingId === store.id}
          onRate={(value) => handleRate(store.id, value)}
        />
      ),
    },
  ]

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

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={stores}
          rowKey={(store) => store.id}
          sort={sort}
          onSort={handleSort}
          loading={loading}
          minWidth={720}
          emptyMessage={
            debouncedSearch
              ? `No stores match "${debouncedSearch}".`
              : 'No stores have been registered yet.'
          }
        />
      </div>

      <Pagination pagination={pagination} onPage={setPage} noun="stores" />
    </div>
  )
}
