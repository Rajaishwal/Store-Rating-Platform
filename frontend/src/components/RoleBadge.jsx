import { ROLE_LABEL } from '../lib/roles'

const ROLE_BADGE = {
  ADMIN: 'bg-violet-100 text-violet-800',
  USER: 'bg-sky-100 text-sky-800',
  OWNER: 'bg-emerald-100 text-emerald-800',
}

/**
 * Role shown as a labelled pill. Identity is carried by the text, not the
 * colour alone, so it still reads without colour vision.
 */
export default function RoleBadge({ role }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[role]}`}>
      {ROLE_LABEL[role]}
    </span>
  )
}
