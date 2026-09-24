import { createContext, useContext } from 'react'

/**
 * The context object and its hook live apart from the provider component.
 *
 * A module that exports both components and plain values breaks Vite's fast
 * refresh — editing the provider would force a full reload instead of
 * preserving state.
 */
export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
