import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { HOME_ROUTE } from '../lib/routes'
import { ROLE_LABEL } from '../lib/roles'
import { Button } from './ui'

/** Links each role sees in the header. */
const NAV_BY_ROLE = {
  ADMIN: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/stores', label: 'Stores' },
    { to: '/admin/users', label: 'Users' },
  ],
  USER: [{ to: '/stores', label: 'Stores', end: true }],
  OWNER: [{ to: '/owner', label: 'Dashboard', end: true }],
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to={HOME_ROUTE[user.role]} className="font-semibold tracking-tight">
            Store Rating Platform
          </Link>

          <nav className="flex items-center gap-1">
            {(NAV_BY_ROLE[user.role] ?? []).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm transition ${
                    isActive
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABEL[user.role]}</p>
            </div>
            <NavLink
              to="/account/password"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm transition ${
                  isActive
                    ? 'bg-slate-100 font-medium text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              Password
            </NavLink>
            <Button variant="secondary" onClick={handleLogout} className="px-3 py-1.5">
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
