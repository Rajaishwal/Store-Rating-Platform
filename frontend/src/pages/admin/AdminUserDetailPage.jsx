import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage } from '../../api/client'
import { StarDisplay } from '../../components/StarRating'
import { Alert, Card } from '../../components/ui'
import RoleBadge from '../../components/RoleBadge'

function DetailRow({ label, children }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm sm:col-span-2">{children}</dd>
    </div>
  )
}

export default function AdminUserDetailPage() {
  const { userId } = useParams()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/admin/users/${userId}`)
        if (!cancelled) setUser(data.user)
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
  }, [userId])

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/admin/users"
        className="text-sm text-slate-600 underline underline-offset-2 hover:text-slate-900"
      >
        &larr; Back to users
      </Link>

      {loading && <p className="mt-6 text-sm text-slate-500">Loading...</p>}

      {error && (
        <div className="mt-6">
          <Alert>{error}</Alert>
        </div>
      )}

      {user && (
        <>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>

          <Card className="mt-6 px-6 py-2">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Name">{user.name}</DetailRow>
              <DetailRow label="Email">{user.email}</DetailRow>
              <DetailRow label="Address">{user.address}</DetailRow>
              <DetailRow label="Role">
                <RoleBadge role={user.role} />
              </DetailRow>
              <DetailRow label="Ratings submitted">{user.ratingsSubmitted}</DetailRow>
            </dl>
          </Card>

          {/* Only store owners have a store, and the requirement is that their
              rating appears here alongside their other details. */}
          {user.ownedStore && (
            <Card className="mt-6 p-6">
              <h2 className="text-lg font-semibold tracking-tight">Store owned</h2>
              <dl className="mt-2 divide-y divide-slate-100">
                <DetailRow label="Store name">{user.ownedStore.name}</DetailRow>
                <DetailRow label="Store email">{user.ownedStore.email}</DetailRow>
                <DetailRow label="Store address">{user.ownedStore.address}</DetailRow>
                <DetailRow label="Rating">
                  <StarDisplay
                    value={user.ownedStore.rating}
                    count={user.ownedStore.ratingCount}
                  />
                </DetailRow>
              </dl>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
