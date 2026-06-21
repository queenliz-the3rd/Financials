import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { MAX_PIN_ATTEMPTS } from '../lib/auth'
import PinPad from './PinPad'

// Shown on every app open: enter the PIN to unlock. After 5 wrong tries the
// account is locked and the user is signed out.
export default function PinLock() {
  const { verifyPin, signOut, user } = useAuth()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (value.length !== 4 || busy) return
    setBusy(true)
    verifyPin(value)
      .then((res) => {
        if (res === 'ok') return // context flips to ready
        if (res === 'locked') {
          setError('Too many attempts. Signing you out…')
          setTimeout(() => signOut(), 1200)
          return
        }
        // wrong
        setAttemptsLeft((prev) => {
          const left = (prev ?? MAX_PIN_ATTEMPTS) - 1
          return left
        })
        setError('Incorrect PIN')
        setShake(true)
        setTimeout(() => setShake(false), 450)
        setValue('')
        setBusy(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Something went wrong.')
        setValue('')
        setBusy(false)
      })
  }, [value, busy, verifyPin, signOut])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-lilac">
          <Lock size={24} className="text-violet-700" />
        </div>
        <h1 className="text-2xl font-extrabold">Enter your PIN</h1>
        <p className="mt-1 text-sm text-muted">Welcome back, {user?.username}</p>
      </div>

      <PinPad value={value} onChange={setValue} shake={shake} disabled={busy} />

      <div className="mt-6 h-5 text-center text-sm font-medium text-rose-500">
        {error}
        {attemptsLeft !== null && attemptsLeft > 0 && error === 'Incorrect PIN' && (
          <span className="text-muted"> · {attemptsLeft} tries left</span>
        )}
      </div>

      <button
        onClick={() => signOut()}
        className="mt-2 text-sm font-semibold text-muted hover:text-ink"
      >
        Forgot PIN? Sign out
      </button>
    </div>
  )
}
