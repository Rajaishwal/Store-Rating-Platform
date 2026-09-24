import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage, fieldErrors } from '../../api/client'
import { useDebounced } from '../../hooks/useDebounced'
import DataTable, { Pagination } from '../../components/DataTable'
import Modal from '../../components/Modal'
import { StarDisplay } from '../../components/StarRating'
import { Alert, Button, Card, Field, Input } from '../../components/ui'
import {
  RULES,
  runValidators,
  validateAddress,
  validateEmail,
  validateName,
} from '../../lib/validation'

const PAGE_SIZE = 10
const EMPTY_FILTERS = { name: '', email: '', address: '' }
const EMPTY_STORE = { name: '', email: '', address: '', ownerId: '' }

export default function AdminStoresPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const debouncedFilters = useDebounced(filters)
  const [sort, setSort] = useState({ by: 'name', order: 'asc' })
  const [page, setPage] = useState(1)

  const [stores, setStores] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [availableOwners, setAvailableOwners] = useState([])
  const [created, setCreated] = useState('')

  const loadStores = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/admin/stores', {
        params: {
          name: debouncedFilters.name || undefined,
          email: debouncedFilters.email || undefined,
          address: debouncedFilters.address || undefined,
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
  }, [debouncedFilters, sort.by, sort.order, page])

  useEffect(() => {
    loadStores()
  }, [loadStores])

  function updateFilter(field) {
    return (event) => {
      setFilters((current) => ({ ...current, [field]: event.target.value }))
      setPage(1)
    }
  }

  function handleSort(column) {
    setSort((current) =>
      current.by === column
        ? { by: column, order: current.order === 'asc' ? 'desc' : 'asc' }
        : { by: column, order: 'asc' },
    )
    setPage(1)
  }

  /**
   * Only store owners who do not already have a store can be assigned one.
   * The server enforces this too; offering an impossible choice and then
   * rejecting it would just be a worse way of saying the same thing.
   */
  async function openModal() {
    setCreated('')
    setModalOpen(true)
    try {
      const { data } = await api.get('/admin/users', { params: { role: 'OWNER', limit: 100 } })
      setAvailableOwners(data.data.filter((user) => user.ownedStore === null))
    } catch {
      setAvailableOwners([])
    }
  }

  const filtersActive = Object.values(debouncedFilters).some(Boolean)

  const columns = [
    {
      key: 'name',
      label: 'Store',
      sortable: true,
      render: (store) => <span className="font-medium">{store.name}</span>,
    },
    { key: 'email', label: 'Email', sortable: true, className: 'text-slate-600' },
    { key: 'address', label: 'Address', sortable: true, className: 'text-slate-600' },
    {
      key: 'owner',
      label: 'Owner',
      render: (store) =>
        store.owner ? (
          store.owner.name
        ) : (
          <span className="text-slate-400">Unassigned</span>
        ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (store) => <StarDisplay value={store.rating} count={store.ratingCount} />,
    },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stores</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every registered store and the average rating it has received.
          </p>
        </div>
        <Button onClick={openModal}>Add store</Button>
      </div>

      {created && (
        <div className="mt-4">
          <Alert kind="success">{created}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Card className="mt-6 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            value={filters.name}
            onChange={updateFilter('name')}
            placeholder="Filter by name"
            aria-label="Filter stores by name"
          />
          <Input
            value={filters.email}
            onChange={updateFilter('email')}
            placeholder="Filter by email"
            aria-label="Filter stores by email"
          />
          <Input
            value={filters.address}
            onChange={updateFilter('address')}
            placeholder="Filter by address"
            aria-label="Filter stores by address"
          />
        </div>
      </Card>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={stores}
          rowKey={(store) => store.id}
          sort={sort}
          onSort={handleSort}
          loading={loading}
          emptyMessage={
            filtersActive ? 'No stores match these filters.' : 'No stores registered yet.'
          }
        />
      </div>

      <Pagination pagination={pagination} onPage={setPage} noun="stores" />

      <AddStoreModal
        open={modalOpen}
        owners={availableOwners}
        onClose={() => setModalOpen(false)}
        onCreated={(store) => {
          setModalOpen(false)
          setCreated(`"${store.name}" was registered.`)
          loadStores()
        }}
      />
    </div>
  )
}

function AddStoreModal({ open, owners, onClose, onCreated }) {
  const [values, setValues] = useState(EMPTY_STORE)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Start from a blank form each time it opens.
  useEffect(() => {
    if (open) {
      setValues(EMPTY_STORE)
      setErrors({})
      setFormError('')
    }
  }, [open])

  const update = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const clientErrors = runValidators(values, {
      name: validateName,
      email: validateEmail,
      address: validateAddress,
    })
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.post('/admin/stores', {
        name: values.name,
        email: values.email,
        address: values.address,
        ownerId: values.ownerId ? Number(values.ownerId) : null,
      })
      onCreated(data.store)
    } catch (err) {
      const serverFields = fieldErrors(err)
      if (Object.keys(serverFields).length > 0) setErrors(serverFields)
      else setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Add store"
      description="An owner can be assigned now or left unassigned."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Alert>{formError}</Alert>

        <Field
          label="Store name"
          error={errors.name}
          hint={`${RULES.name.min}-${RULES.name.max} characters`}
        >
          <Input value={values.name} onChange={update('name')} error={errors.name} required />
        </Field>

        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            value={values.email}
            onChange={update('email')}
            error={errors.email}
            required
          />
        </Field>

        <Field label="Address" error={errors.address}>
          <textarea
            value={values.address}
            onChange={update('address')}
            rows={2}
            maxLength={RULES.address.max}
            className={`w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-slate-900/10 ${
              errors.address ? 'border-red-400' : 'border-slate-300 focus:border-slate-500'
            }`}
            required
          />
        </Field>

        <Field
          label="Owner"
          error={errors.ownerId}
          hint={
            owners.length === 0
              ? 'No unassigned store-owner accounts. Create one from the Users page first.'
              : 'Optional. Only owners without a store are listed.'
          }
        >
          <select
            value={values.ownerId}
            onChange={update('ownerId')}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none
              transition focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">No owner</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name} ({owner.email})
              </option>
            ))}
          </select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add store'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
