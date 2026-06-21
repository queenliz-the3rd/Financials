import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PinPad from './PinPad'

// First-run screen: choose a 4-digit PIN, then confirm it.
export default function PinSetup() {
  const { setPin, signOut, user } = useAuth()
  const [step, setStep] = useState<'choose' | 'confirm'>('choose')
  const [first, setFirst] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (value.length !== 4 || busy) return

    if (step === 'choose') {
      setFirst(value)
      setStep('confirm')
      setValue('')
      setError('')
      return
    }

    // confirm step
    if (value !== first) {
      setError('PINs didn’t match — let’s try again.')
      setShake(true)
      setTimeout(() => setShake(false), 450)
      setStep('choose')
      setFirst('')
      setValue('')
      return
    }

    setBusy(true)
    setPin(value).catch((e) => {
      setError(e instanceof Error ? e.message : 'Could not save PIN.')
      setBusy(false)
      setStep('choose')
      setFirst('')
      setValue('')
    })
  }, [value, step, first, busy, setPin])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold text-muted">Hi {user?.username} 👋</p>
        <h1 className="mt-1 text-2xl font-extrabold">
          {step === 'choose' ? 'Create a 4-digit PIN' : 'Confirm your PIN'}
        </h1>
        <p className="mt-2 max-w-xs text-sm text-muted">
          You’ll enter this each time you open Penny to keep your money private.
        </p>
      </div>

      <PinPad value={value} onChange={setValue} shake={shake} disabled={busy} />

      <p className="mt-6 h-5 text-sm font-medium text-rose-500">{error}</p>

      <button
        onClick={() => signOut()}
        className="mt-2 text-sm font-semibold text-muted hover:text-ink"
      >
        Sign out
      </button>
    </div>
  )
}
