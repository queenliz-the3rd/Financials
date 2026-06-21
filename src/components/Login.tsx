import { useState } from 'react'
import { Loader2, User, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { validateUsername } from '../lib/auth'

export default function Login() {
  const { signIn, signUp, cloud } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [stay, setStay] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const uErr = validateUsername(username)
    if (uErr) return setError(uErr)
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (mode === 'signup' && password !== confirm) return setError('Passwords don’t match.')

    setBusy(true)
    try {
      if (mode === 'signup') await signUp(username, password, stay)
      else await signIn(username, password, stay)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm animate-pop p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-lavender text-2xl font-extrabold text-white shadow-soft">
            P
          </div>
          <h1 className="text-2xl font-extrabold">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-muted">money, made calm</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Username</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-10"
                placeholder="yourname"
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="password"
                className="input pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="animate-fade-in">
              <label className="label">Confirm password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 accent-lavender"
              checked={stay}
              onChange={(e) => setStay(e.target.checked)}
            />
            Stay logged in on this device
          </label>

          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {mode === 'signin' ? "Don't have an account?" : 'Already have one?'}{' '}
          <button
            className="font-semibold text-lavender hover:underline"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError('')
            }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {!cloud && (
          <p className="mt-4 rounded-2xl bg-butter/30 px-3 py-2 text-center text-xs text-muted">
            Demo mode: accounts are stored on this device only.
          </p>
        )}
      </div>
    </div>
  )
}
