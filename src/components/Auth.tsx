import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Shown only in cloud mode when no user is signed in.
export default function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm animate-pop p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-lavender text-2xl font-extrabold text-white shadow-soft">
          P
        </div>
        <h1 className="text-2xl font-extrabold">Welcome to Penny</h1>
        <p className="mt-1 text-sm text-muted">money, made calm</p>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-mint/40 p-4 text-sm">
            ✨ Check your inbox — we sent a magic sign-in link to{' '}
            <span className="font-semibold">{email}</span>.
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-6 space-y-3 text-left">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
            <p className="text-center text-xs text-muted">
              No password needed — we'll email you a secure link.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
