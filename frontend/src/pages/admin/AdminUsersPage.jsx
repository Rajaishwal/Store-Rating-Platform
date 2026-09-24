import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage, fieldErrors } from '../../api/client'
import { useDebounced } from '../../hooks/useDebounced'
import DataTable, { Pagination } from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Alert, Button, Card, Field, Input } from '../../components/ui'
import {
  RULES,
  runValidators,
  validateAddress,
  validateEmail,
  validateName,
  validatePassword,
} from '../../lib/validation'

const PAGE_SIZE = 10
const EMPTY_FILTERS = { name: '', email: '', address: '', role: '' }
const EMPTY_USER = { name: '', email: '', address: '', password: '', role: 'USER' }

export const ROLE_LABEL = {
  ADMIN: 'Administrator',
  USER: 'Normal user',
  OWNER: 'Store owner',
}

const ROLE_BADGE = {
  ADMIN: 'bg-violet-100 text-violet-800',
  USER: 'bg-sky-100 text-sky-800',
  OWNER: 'bg-emerald-100 text-emerald-800',
}

export function RoleBadge({ role }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[role]}`}>
      {ROLE_LABEL[role]}
    </span>
  )
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const debouncedFilters = useDebounced(filters)
  const [sort, setSort] = useState({ by: 'name', order: 'asc' })
  const [page, setPage] = useState(1)

  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [created, setCreated] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/admin/users', {
        params: {
          name: debouncedFilters.name || undefined,
          email: debouncedFilters.email || undefined,
          address: debouncedFilters.address || undefined,
          role: debouncedFilters.role || undefined,
          sortBy: sort.by,
          order: sort.order,
          page,
          limit: PAGE_SIZE,
        },
      })
      setUsers(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(errorMessage(err))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [debouncedFilters, sort.by, sort.order, page])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

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

  const filtersActive = Object.values(debouncedFilters).some(Boolean)

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (user) => <span className="font-medium">{user.name}</span>,
    },
    { key: 'email', label: 'Email', sortable: true, className: 'text-slate-600' },
    { key: 'address', label: 'Address', sortable: true, className: 'text-slate-600' },
    { key: 'role', label: 'Role', sortable: true, render: (user) => <RoleBadge role={user.role} /> },
    {
      key: 'storeRating',
      // Only store owners have one, so the column reads as blank for everyone
      // else rather than showing a misleading zero.
      label: 'Store rating',
      render: (user) => {
        if (!user.ownedStore) return <span className="text-slate-300">&mdash;</span>
        if (user.ownedStore.rating === null) {
          return <span className="text-slate-400">No ratings yet</span>
        }
        return (
          <span className="font-medium tabular-nums">{user.ownedStore.rating.toFixed(1)}</span>
        )
      },
    },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-slate-600">
            Select a row to see full details. Store owners show their store's rating.
          </p>
        </div>
        <Button onClick={() => { setCreated(''); setModalOpen(true) }}>Add user</Button>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={filters.name}
            onChange={updateFilter('name')}
            placeholder="Filter by name"
            aria-label="Filter users by name"
          />
          <Input
            value={filters.email}
            onChange={updateFilter('email')}
            placeholder="Filter by email"
            aria-label="Filter users by email"
          />
          <Input
            value={filters.address}
            onChange={updateFilter('address')}
            placeholder="Filter by address"
            aria-label="Filter users by address"
          />
          <select
            value={filters.role}
            onChange={updateFilter('role')}
            aria-label="Filter users by role"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none
              transition focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">All roles</option>
            <option value="ADMIN">Administrator</option>
            <option value="USER">Normal user</option>
            <option value="OWNER">Store owner</option>
          </select>
        </div>
      </Card>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(user) => user.id}
          sort={sort}
          onSort={handleSort}
          loading={loading}
          onRowClick={(user) => navigate(`/admin/users/${user.id}`)}
          emptyMessage={filtersActive ? 'No users match these filters.' : 'No users yet.'}
        />
      </div>

      <Pagination pagination={pagination} onPage={setPage} noun="users" />

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(user) => {
          setModalOpen(false)
          setCreated(`${user.name} was created as ${ROLE_LABEL[user.role].toLowerCase()}.`)
          loadUsers()
        }}
      />
    </div>
  )
}

function AddUserModal({ open, onClose, onCreated }) {
  const [values, setValues] = useState(EMPTY_USER)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(EMPTY_USER)
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
      password: validatePassword,
    })
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.post('/admin/users', values)
      onCreated(data.user)
    } catch (err) {
      const serverFields = fieldErrors(err)
      if (Object.keys(serverFields).length > 0) setErrors(serverFields)
      else setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const nameLength = values.name.trim().length

  return (
    <Modal
      open={open}
      title="Add user"
      description="Administrators, normal users and store owners are all created here."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Alert>{formError}</Alert>

        <Field
          label="Name"
          error={errors.name}
          hint={`${nameLength}/${RULES.name.max} characters, minimum ${RULES.name.min}`}
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
          label="Password"
          error={errors.password}
          hint="8 to 16 characters, with an uppercase letter and a special character"
        >
          <Input
            type="password"
            value={values.password}
            onChange={update('password')}
            error={errors.password}
            autoComplete="new-password"
            required
          />
        </Field>

        <Field label="Role" error={errors.role}>
          <select
            value={values.role}
            onChange={update('role')}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none
              transition focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="USER">Normal user</option>
            <option value="OWNER">Store owner</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create user'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
