import { Card } from '../components/ui'
import { useAuth } from '../context/AuthContext'

/**
 * Temporary landing page for a role whose features are not built yet.
 * Each phase replaces one of these with the real screen.
 */
export default function ComingSoon({ title, phase, features }) {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Signed in as {user.email}. Authentication and role routing are working.
      </p>

      <Card className="mt-6 p-6">
        <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          Arriving in {phase}
        </span>
        <ul className="mt-4 space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-slate-400">&#9633;</span>
              {feature}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
