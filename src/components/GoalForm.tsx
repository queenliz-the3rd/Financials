import { useState } from 'react'
import { todayISO } from '../lib/format'
import type { Goal } from '../lib/types'

const EMOJIS = ['🛟', '🗾', '🏖️', '🚗', '🏡', '💍', '🎓', '💻', '🎁', '🐶', '🌱', '✈️']

export interface GoalFormValues {
  name: string
  target_amount: number
  emoji: string
  deadline: string | null
  monthly_target: number | null
}

interface Props {
  initial?: Goal
  onSubmit: (v: GoalFormValues) => Promise<void> | void
  onCancel: () => void
}

export default function GoalForm({ initial, onSubmit, onCancel }: Props) {
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJIS[0])
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial ? String(initial.target_amount) : '')
  const [hasDeadline, setHasDeadline] = useState(!!initial?.deadline)
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [monthly, setMonthly] = useState(
    initial?.monthly_target ? String(initial.monthly_target) : '',
  )
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = parseFloat(target)
    if (!name.trim() || !Number.isFinite(t) || t <= 0) return
    const m = parseFloat(monthly)
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        target_amount: Math.round(t * 100) / 100,
        emoji,
        deadline: hasDeadline && deadline ? deadline : null,
        monthly_target: Number.isFinite(m) && m > 0 ? Math.round(m * 100) / 100 : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Pick an icon</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition ${
                emoji === e ? 'bg-lavender/30 ring-2 ring-lavender' : 'bg-white/60 hover:bg-lilac/30'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Goal name</label>
        <input
          className="input"
          placeholder="e.g. Summer in Italy"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Target amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
          <input
            className="input pl-8 text-lg font-bold"
            inputMode="decimal"
            placeholder="0.00"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Monthly contribution goal (optional)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
          <input
            className="input pl-8"
            inputMode="decimal"
            placeholder="aim to add this much each month"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4 accent-lavender"
            checked={hasDeadline}
            onChange={(e) => {
              setHasDeadline(e.target.checked)
              if (e.target.checked && !deadline) setDeadline(todayISO())
            }}
          />
          Set a deadline
        </label>
        {hasDeadline && (
          <input
            type="date"
            className="input mt-2 animate-fade-in"
            min={todayISO()}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" className="btn-ghost flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={saving || !name || !target}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create goal'}
        </button>
      </div>
    </form>
  )
}
