import { supabase, isSupabaseConfigured, setPersist } from './supabase'

// Auth abstraction. Uses Supabase email/password when configured (the "username"
// is mapped to a synthetic email so people only ever pick a username + password),
// and mirrors the whole flow in localStorage for the zero-setup demo so the PIN
// experience is testable without a backend.

export interface AuthUser {
  id: string
  username: string
  email?: string
}

export type VerifyResult = 'ok' | 'wrong' | 'locked' | 'no_pin'

export const MAX_PIN_ATTEMPTS = 5
export const USERNAME_EMAIL_DOMAIN = 'users.pennyapp.app'

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`
}

export function isSyntheticEmail(email?: string): boolean {
  return !!email && email.endsWith(`@${USERNAME_EMAIL_DOMAIN}`)
}

export function validateUsername(u: string): string | null {
  const v = u.trim()
  if (v.length < 3) return 'Username must be at least 3 characters.'
  if (v.length > 20) return 'Username must be 20 characters or fewer.'
  if (!/^[a-zA-Z0-9._-]+$/.test(v)) return 'Use only letters, numbers, dots, dashes or underscores.'
  return null
}

export interface AuthAdapter {
  cloud: boolean
  getUser(): Promise<AuthUser | null>
  signUp(username: string, password: string, stayLoggedIn: boolean): Promise<AuthUser>
  signIn(username: string, password: string, stayLoggedIn: boolean): Promise<AuthUser>
  signOut(): Promise<void>
  hasPin(): Promise<boolean>
  setPin(pin: string): Promise<void>
  verifyPin(pin: string): Promise<VerifyResult>
}

/* ------------------------------ Crypto helpers ----------------------------- */

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomSaltHex(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer)
}

async function pbkdf2(text: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
  const key = await crypto.subtle.importKey('raw', enc.encode(text), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(bits)
}

/* -------------------------------- Local auth ------------------------------- */

interface LocalUser {
  id: string
  username: string
  salt: string
  passHash: string
  pinSalt?: string
  pinHash?: string
  pinAttempts: number
}

const LS_USERS = 'penny.auth.users.v1'
const CURRENT_KEY = 'penny.auth.current.v1'

function readUsers(): Record<string, LocalUser> {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS) ?? '{}')
  } catch {
    return {}
  }
}
function writeUsers(u: Record<string, LocalUser>) {
  localStorage.setItem(LS_USERS, JSON.stringify(u))
}
function currentStore(stay: boolean): Storage {
  return stay ? localStorage : sessionStorage
}

class LocalAuth implements AuthAdapter {
  cloud = false

  private currentId(): string | null {
    return localStorage.getItem(CURRENT_KEY) ?? sessionStorage.getItem(CURRENT_KEY)
  }

  async getUser(): Promise<AuthUser | null> {
    const id = this.currentId()
    if (!id) return null
    const users = readUsers()
    const u = Object.values(users).find((x) => x.id === id)
    return u ? { id: u.id, username: u.username } : null
  }

  async signUp(username: string, password: string, stay: boolean): Promise<AuthUser> {
    const key = username.trim().toLowerCase()
    const users = readUsers()
    if (users[key]) throw new Error('That username is already taken.')
    const salt = randomSaltHex()
    const passHash = await pbkdf2(password, salt)
    const user: LocalUser = {
      id: 'local_' + crypto.randomUUID(),
      username: username.trim(),
      salt,
      passHash,
      pinAttempts: 0,
    }
    users[key] = user
    writeUsers(users)
    this.setCurrent(user.id, stay)
    return { id: user.id, username: user.username }
  }

  async signIn(username: string, password: string, stay: boolean): Promise<AuthUser> {
    const key = username.trim().toLowerCase()
    const users = readUsers()
    const u = users[key]
    if (!u) throw new Error('No account with that username.')
    const hash = await pbkdf2(password, u.salt)
    if (hash !== u.passHash) throw new Error('Incorrect password.')
    u.pinAttempts = 0 // fresh login clears any lockout
    writeUsers(users)
    this.setCurrent(u.id, stay)
    return { id: u.id, username: u.username }
  }

  private setCurrent(id: string, stay: boolean) {
    setPersist(stay)
    localStorage.removeItem(CURRENT_KEY)
    sessionStorage.removeItem(CURRENT_KEY)
    currentStore(stay).setItem(CURRENT_KEY, id)
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(CURRENT_KEY)
    sessionStorage.removeItem(CURRENT_KEY)
  }

  private current(): LocalUser | undefined {
    const id = this.currentId()
    if (!id) return undefined
    return Object.values(readUsers()).find((x) => x.id === id)
  }

  async hasPin(): Promise<boolean> {
    return !!this.current()?.pinHash
  }

  async setPin(pin: string): Promise<void> {
    if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be 4 digits.')
    const users = readUsers()
    const u = this.current()
    if (!u) throw new Error('Not signed in.')
    const pinSalt = randomSaltHex()
    u.pinSalt = pinSalt
    u.pinHash = await pbkdf2(pin, pinSalt)
    u.pinAttempts = 0
    users[u.username.toLowerCase()] = u
    writeUsers(users)
  }

  async verifyPin(pin: string): Promise<VerifyResult> {
    const users = readUsers()
    const u = this.current()
    if (!u || !u.pinHash || !u.pinSalt) return 'no_pin'
    if (u.pinAttempts >= MAX_PIN_ATTEMPTS) return 'locked'
    const hash = await pbkdf2(pin, u.pinSalt)
    if (hash === u.pinHash) {
      u.pinAttempts = 0
      users[u.username.toLowerCase()] = u
      writeUsers(users)
      return 'ok'
    }
    u.pinAttempts += 1
    users[u.username.toLowerCase()] = u
    writeUsers(users)
    return u.pinAttempts >= MAX_PIN_ATTEMPTS ? 'locked' : 'wrong'
  }
}

/* -------------------------------- Cloud auth ------------------------------- */

class CloudAuth implements AuthAdapter {
  cloud = true

  async getUser(): Promise<AuthUser | null> {
    const { data } = await supabase!.auth.getUser()
    const u = data.user
    if (!u) return null
    const username = (u.user_metadata?.username as string) ?? (u.email?.split('@')[0] ?? 'you')
    return { id: u.id, username, email: u.email ?? undefined }
  }

  async signUp(username: string, password: string, stay: boolean): Promise<AuthUser> {
    setPersist(stay)
    const email = usernameToEmail(username)
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } },
    })
    if (error) {
      if (error.message.toLowerCase().includes('registered')) {
        throw new Error('That username is already taken.')
      }
      throw error
    }
    if (!data.session) {
      throw new Error(
        'Account created, but email confirmation is on in Supabase. Disable "Confirm email" in Auth settings to use username/password directly.',
      )
    }
    // Save username on the profile row (best effort)
    await supabase!.from('profiles').upsert(
      { user_id: data.user!.id, username: username.trim() },
      { onConflict: 'user_id' },
    )
    return { id: data.user!.id, username: username.trim(), email }
  }

  async signIn(username: string, password: string, stay: boolean): Promise<AuthUser> {
    setPersist(stay)
    const email = usernameToEmail(username)
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Incorrect username or password.')
    await supabase!.rpc('reset_pin_attempts') // fresh login clears any lockout
    const uname = (data.user.user_metadata?.username as string) ?? username.trim()
    return { id: data.user.id, username: uname, email: data.user.email ?? undefined }
  }

  async signOut(): Promise<void> {
    await supabase!.auth.signOut()
  }

  async hasPin(): Promise<boolean> {
    const { data, error } = await supabase!.rpc('has_pin')
    if (error) throw error
    return Boolean(data)
  }

  async setPin(pin: string): Promise<void> {
    const { error } = await supabase!.rpc('set_pin', { new_pin: pin })
    if (error) throw error
  }

  async verifyPin(pin: string): Promise<VerifyResult> {
    const { data, error } = await supabase!.rpc('verify_pin', { attempt: pin })
    if (error) throw error
    return data as VerifyResult
  }
}

export const auth: AuthAdapter = isSupabaseConfigured ? new CloudAuth() : new LocalAuth()
