import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

// "Stay logged in" controls where the auth session is stored:
//   on  -> localStorage  (survives browser restarts)
//   off -> sessionStorage (cleared when the browser/tab closes)
const PERSIST_KEY = 'penny.persist'

export function setPersist(stayLoggedIn: boolean) {
  localStorage.setItem(PERSIST_KEY, stayLoggedIn ? '1' : '0')
}

function persistOn(): boolean {
  return localStorage.getItem(PERSIST_KEY) !== '0' // default: stay logged in
}

// Routes Supabase's session token to local- or sessionStorage based on the pref.
const hybridStorage = {
  getItem(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  },
  setItem(key: string, value: string): void {
    if (persistOn()) {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
      localStorage.removeItem(key)
    }
  },
  removeItem(key: string): void {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        storage: hybridStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
