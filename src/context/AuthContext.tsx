import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { auth, type AuthUser, type VerifyResult } from '../lib/auth'

// App phases that drive what the user sees:
//   loading -> login -> setpin (first time) -> lock (PIN required) -> ready
export type Phase = 'loading' | 'login' | 'setpin' | 'lock' | 'ready'

interface AuthState {
  phase: Phase
  user: AuthUser | null
  cloud: boolean
  signUp: (u: string, p: string, stay: boolean) => Promise<void>
  signIn: (u: string, p: string, stay: boolean) => Promise<void>
  signOut: () => Promise<void>
  setPin: (pin: string) => Promise<void>
  verifyPin: (pin: string) => Promise<VerifyResult>
  lock: () => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hasPin, setHasPin] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [booted, setBooted] = useState(false)

  // On load, restore the session if any. PIN is always required after a fresh
  // load (unlocked starts false), so the lock screen shows every time.
  useEffect(() => {
    ;(async () => {
      try {
        const u = await auth.getUser()
        setUser(u)
        if (u) setHasPin(await auth.hasPin())
      } finally {
        setBooted(true)
      }
    })()
  }, [])

  const refreshAfterAuth = useCallback(async (u: AuthUser) => {
    setUser(u)
    setUnlocked(false)
    setHasPin(await auth.hasPin())
  }, [])

  const value = useMemo<AuthState>(() => {
    const phase: Phase = !booted
      ? 'loading'
      : !user
        ? 'login'
        : !hasPin
          ? 'setpin'
          : !unlocked
            ? 'lock'
            : 'ready'

    return {
      phase,
      user,
      cloud: auth.cloud,
      async signUp(u, p, stay) {
        const newUser = await auth.signUp(u, p, stay)
        await refreshAfterAuth(newUser)
      },
      async signIn(u, p, stay) {
        const newUser = await auth.signIn(u, p, stay)
        await refreshAfterAuth(newUser)
      },
      async signOut() {
        await auth.signOut()
        setUser(null)
        setHasPin(false)
        setUnlocked(false)
      },
      async setPin(pin) {
        await auth.setPin(pin)
        setHasPin(true)
        setUnlocked(true)
      },
      async verifyPin(pin) {
        const res = await auth.verifyPin(pin)
        if (res === 'ok') setUnlocked(true)
        return res
      },
      lock() {
        setUnlocked(false)
      },
    }
  }, [booted, user, hasPin, unlocked, refreshAfterAuth])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
