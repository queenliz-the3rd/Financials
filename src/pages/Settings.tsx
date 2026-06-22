import { useEffect, useMemo, useState } from 'react'
import { Mail, Clock, Send, Cloud, Check, Loader2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { buildInsight } from '../lib/insight'
import { isSyntheticEmail } from '../lib/auth'
import { type Settings as SettingsT } from '../lib/types'

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMEZONES = [
  { id: 'America/New_York', label: 'Eastern (New York)' },
  { id: 'America/Chicago', label: 'Central (Chicago)' },
  { id: 'America/Denver', label: 'Mountain (Denver)' },
  { id: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Paris', label: 'Central Europe (Paris)' },
]

function hourLabel(h: number): string {
  const am = h < 12
  const base = h % 12 === 0 ? 12 : h % 12
  return `${base}:00 ${am ? 'AM' : 'PM'}`
}

export default function SettingsPage() {
  const { transactions, budgets, goals, settings: ctxSettings, updateSettings } = useData()
  const [settings, setSettings] = useState<SettingsT>(ctxSettings)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [testMsg, setTestMsg] = useState('')

  // Prefill the email with the signed-in account if we don't have one yet.
  useEffect(() => {
    if (settings.email_to || !isSupabaseConfigured || !supabase) return
    ;(async () => {
      const { data } = await supabase!.auth.getUser()
      if (data.user?.email && !isSyntheticEmail(data.user.email)) {
        setSettings((prev) => ({ ...prev, email_to: data.user!.email as string }))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const preview = useMemo(
    () => buildInsight(transactions, budgets, goals),
    [transactions, budgets, goals],
  )

  function patch(p: Partial<SettingsT>) {
    setSettings((prev) => ({ ...prev, ...p }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      await updateSettings(settings)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    if (!isSupabaseConfigured || !supabase) return
    setTestState('sending')
    setTestMsg('')
    try {
      await updateSettings(settings) // make sure the backend has the latest email
      const { error } = await supabase.functions.invoke('weekly-insight', {
        body: { test: true },
      })
      if (error) throw error
      setTestState('sent')
      setTestMsg(`Sent! Check ${settings.email_to}.`)
    } catch (e) {
      setTestState('error')
      setTestMsg(e instanceof Error ? e.message : 'Could not send test email.')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">Weekly insights, delivered to your inbox.</p>
      </header>

      {!isSupabaseConfigured && (
        <div className="card flex items-start gap-3 border-butter/60 bg-butter/30 p-4">
          <Cloud size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-ink">
            You're in <b>local mode</b>. You can set your preferences and preview the email
            here, but automatic weekly emails only send once the Supabase + Resend backend is
            configured (see <code className="rounded bg-white/70 px-1">README.md</code>).
          </p>
        </div>
      )}

      {/* Weekly email card */}
      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lilac">
              <Mail size={20} className="text-violet-700" />
            </div>
            <div>
              <h2 className="font-bold">Weekly insight email</h2>
              <p className="text-xs text-muted">A friendly recap, once a week.</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={settings.email_enabled}
            onClick={() => patch({ email_enabled: !settings.email_enabled })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              settings.email_enabled ? 'bg-lavender' : 'bg-lilac/60'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                settings.email_enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div className="mt-5">
          <label className="label">Send to</label>
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            value={settings.email_to}
            onChange={(e) => patch({ email_to: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted">
            Used for both the weekly email and the test below.
          </p>
        </div>

        {settings.email_enabled && (
          <div className="mt-4 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Day</label>
                <select
                  className="input"
                  value={settings.send_dow}
                  onChange={(e) => patch({ send_dow: Number(e.target.value) })}
                >
                  {DOW.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Time</label>
                <select
                  className="input"
                  value={settings.send_hour}
                  onChange={(e) => patch({ send_hour: Number(e.target.value) })}
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Timezone</label>
                <select
                  className="input"
                  value={settings.timezone}
                  onChange={(e) => patch({ timezone: e.target.value })}
                >
                  {TIMEZONES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="flex items-center gap-2 rounded-2xl bg-mint/30 px-4 py-3 text-sm">
              <Clock size={15} className="text-emerald-700" />
              You'll get your insight every <b>{DOW[settings.send_dow]}</b> at{' '}
              <b>{hourLabel(settings.send_hour)}</b>.
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
            {saved ? 'Saved' : 'Save preferences'}
          </button>
          {isSupabaseConfigured && (
            <button
              className="btn-ghost"
              onClick={sendTest}
              disabled={testState === 'sending' || !settings.email_to}
              title={!settings.email_to ? 'Enter an email address first' : undefined}
            >
              {testState === 'sending' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send me a test now
            </button>
          )}
          {testMsg && (
            <span
              className={`text-sm ${testState === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}
            >
              {testMsg}
            </span>
          )}
        </div>
      </section>

      {/* Live preview */}
      <section className="card p-5">
        <h2 className="mb-1 font-bold">Preview</h2>
        <p className="mb-4 text-xs text-muted">
          This is what would land in your inbox right now, from your current data.
        </p>
        <div className="rounded-2xl bg-cream p-4">
          <p className="mb-3 text-sm font-bold">{preview.subject}</p>
          <ul className="space-y-2">
            {preview.text
              .split('\n')
              .filter((l) => l.startsWith('•'))
              .map((l, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-lilac/40 bg-white px-3 py-2 text-sm"
                >
                  {l.replace(/^•\s*/, '')}
                </li>
              ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
