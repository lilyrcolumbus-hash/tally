import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase'

interface AuthUser {
  id: string
  email: string | null
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true
    let subscription: { unsubscribe: () => void } | null = null

    const init = async () => {
      const supabase = await getSupabase()
      if (!supabase || !active) {
        setLoading(false)
        return
      }
      const { data } = await supabase.auth.getSession()
      if (active) {
        const sessionUser = data.session?.user
        setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email ?? null } : null)
        setLoading(false)
      }
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return
        const u = session?.user
        setUser(u ? { id: u.id, email: u.email ?? null } : null)
      })
      subscription = listener.subscription
    }

    init().catch((err) => {
      console.error('[auth] init failed:', err)
      setLoading(false)
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string): Promise<void> => {
    const supabase = await getSupabase()
    if (!supabase) throw new Error('Cloud sync is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  const signUp = async (email: string, password: string): Promise<void> => {
    const supabase = await getSupabase()
    if (!supabase) throw new Error('Cloud sync is not configured')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
  }

  const signOut = async (): Promise<void> => {
    setUser(null)
    const supabase = await getSupabase()
    if (supabase) await supabase.auth.signOut().catch(() => undefined)
  }

  return (
    <AuthContext.Provider value={{ user, loading, configured: isSupabaseConfigured, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
