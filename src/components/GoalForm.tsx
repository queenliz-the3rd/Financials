import { useMemo, useState } from 'react'
import { todayISO, monthsUntil, formatMoney } from '../lib/format'
import { type PeriodConfig, toPeriodAmount, fromPeriodAmount, periodShort, periodLong } from '../lib/period'
import type { Goal } from '../lib/types'

const EMOJIS = ['🛟', '🗾', '🏖️', '🚗', '🏡', '💍', '🎓', '💻', '🎁', '🐶', '🌱', '✈️']

export interface GoalFormValues {
  name: string
  target_amount: number
  emoji: string
  deadline: string | null
  monthly_target: number | null // canonical monthly
  auto_contribution: boolean
}

interface Props {
  initial?: Goal
  periodCfg: PeriodConfig
  onSubmit: (v: GoalFormValues) => Promise<void> | void
  onCancel: () => void
}

export default function GoalForm({ initial, periodCfg, onSubmit, onCancel }: Props) {
  const [emoji, setEmoji] = useState(initial?.emoji ?? EMOJIS[0])
  const [name, setName] = useState(initial?.name ?? '')
  const [target, setTarget] = useState(initial ? String(initial.target_amount) : '')
  const [hasDeadline, setHasDeadline] = useState(!!initial?.deadline)
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [auto, setAuto] = useState(initial?.auto_contribution ?? false)
  // The monthly field shows a PERIOD amount to the user; we convert to monthly on save.
  const [periodAmt, setPeriodAmt] = useState(
    initial?.monthly_target ? String(Math.round(toPeriodAmount(initial.monthly_target, periodCfg))) : '',
  )
  const [saving, setSaving] = useState(false)

  const saved = initial?.saved_amount ?? 0
  const unit = periodShort(periodCfg)

  // Auto-calculated required contribution (monthly canonical) from the deadline.
  const autoMonthly = useMemo(() => {
    const t = parseFloat(target)
    if (!hasDeadline || !deadline || !Number.isFinite(t)) return null
    const remaining = Math.max(0, t - saved)
    const months = monthsUntil(deadline)
    if (months <= 0) return remaining // due now-ish: needs it all
    return remaining / months
  }, [target, hasDeadline, deadline, saved])

  const autoPeriod = autoMonthly != null ? toPeriodAmount(autoMonthly, periodCfg) : null
  const canAuto = hasDeadline && !!deadline

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = parseFloat(target)
    if (!name.trim() || !Number.isFinite(t) || t <= 0) return

    let monthly_target: number | null = null
    const useAuto = canAuto && auto
    if (useAuto && autoMonthly != null) {
      monthly_target = Math.round(autoMonthly * 100) / 100
    } else {
      const p = parseFloat(periodAmt)
      if (Number.isFinite(p) && p > 0) {
        // convert the entered period amount back to canonical monthly
        monthly_target = Math.round(fromPeriodAmount(p, periodCfg) * 100) / 100
      }
    }

    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        target_amount: Math.round(t * 100) / 100,
        emoji,
        deadline: hasDeadline && deadline ? deadline : null,
        monthly_target,
        auto_contribution: useAuto,
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

      {/* Deadline */}
      <div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4 accent-lavender"
            checked={hasDeadline}
            onChange={(e) => {
              setHasDeadline(e.target.checked)
              if (e.target.checked && !deadline) setDeadline(todayISO())
              if (!e.target.checked) setAuto(false)
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

      {/* Auto-calc toggle (only with a deadline) */}
      {canAuto && (
        <label className="flex cursor-pointer items-start gap-2 rounded-2xl bg-mint/20 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-lavender"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
          />
          <span>
            <span className="font-semibold">Auto-calculate my contribution</span>
            {auto && autoPeriod != null && (
              <span className="block text-muted">
                Save <b>{formatMoney(autoPeriod)}</b> {periodLong(periodCfg)} to hit this on time.
              </span>
            )}
            {!auto && <span className="block text-muted">Or set your own amount below.</span>}
          </span>
        </label>
      )}

      {/* Manual contribution (hidden when auto is on) */}
      {!(canAuto && auto) && (
        <div>
          <label className="label">Contribution goal per {unit} (optional)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
            <input
              className="input pl-8"
              inputMode="decimal"
              placeholder={`aim to add this much per ${unit}`}
              value={periodAmt}
              onChange={(e) => setPeriodAmt(e.target.value)}
            />
          </div>
        </div>
      )}

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
