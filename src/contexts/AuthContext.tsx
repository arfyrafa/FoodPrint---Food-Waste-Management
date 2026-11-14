import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Outlet, Profile } from '../lib/types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  outlet: Outlet | null
  loading: boolean
  /** true setelah user menekan Keluar (dipakai agar diarahkan ke beranda, bukan ke halaman login) */
  signedOut: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [outlet, setOutlet] = useState<Outlet | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedOut, setSignedOut] = useState(false)
  const userIdRef = useRef<string | undefined>(undefined)

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null)
      setOutlet(null)
      return
    }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile((p as Profile) ?? null)
    if (p?.role === 'owner') {
      const { data: o } = await supabase.from('outlets').select('*').eq('owner_id', userId).maybeSingle()
      setOutlet((o as Outlet) ?? null)
    } else {
      setOutlet(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      userIdRef.current = data.session?.user.id
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (active) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) setSignedOut(false)
      const newId = newSession?.user.id
      // Muat ulang profil hanya jika user berganti (SIGNED_IN juga terpicu saat tab kembali fokus)
      if (newId !== userIdRef.current) {
        userIdRef.current = newId
        setLoading(true)
        // jangan await di dalam callback auth (rekomendasi supabase-js)
        setTimeout(() => {
          loadProfile(newId).finally(() => setLoading(false))
        }, 0)
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refresh = useCallback(() => loadProfile(session?.user.id), [loadProfile, session?.user.id])
  const signOut = useCallback(async () => {
    setSignedOut(true)
    await supabase.auth.signOut()
    setProfile(null)
    setOutlet(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, outlet, loading, signedOut, refresh, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}

/** Untuk halaman owner: outlet pasti ada (dijaga RequireRole). */
export function useOutlet(): Outlet {
  const { outlet } = useAuth()
  if (!outlet) throw new Error('Outlet tidak ditemukan')
  return outlet
}
