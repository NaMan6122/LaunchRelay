import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { api } from './api'

interface AuthUser {
  email: string
  startupId?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('lr_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (token: string) => {
    const res = await api.auth.verify(token)
    const u = { email: res.email, startupId: res.startup_id }
    sessionStorage.setItem('lr_token', res.token)
    sessionStorage.setItem('lr_user', JSON.stringify(u))
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('lr_token')
    sessionStorage.removeItem('lr_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
