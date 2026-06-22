import { useMemo, useState } from 'react'
import { Wallet, TrendingDown, PiggyBank, Sparkles, Gift, Plus } from 'lucide-react'
import { useData } from '../context/DataContext'
import { incomeStats, buildAllocation, goalPace } from '../lib/planner'
import { formatMoney } from '../lib/format'
import { periodLabel, periodLong } from '../lib/period'

// Income planner built for irregular income: it reads your actual logged income
// (this period + a rolling average scaled to the period) and lets you plan any
// amount across budgets and goals. A separate "windfall" section handles one-off
// gifts and side-job money.
export default function IncomePlanner() {
  const { transactions, budgets, goals, periodCfg, contributeToGoal } = useData()
  const stats = useMemo(() => incomeStats(transactions, periodCfg), [transactions, periodCfg])

  const defaultAmount = stats.thisPeriod > 0 ? stats.thisPeriod : Math.round(stats.avgPerPeriod)
  const [raw, setRaw] = useState<string>(defaultAmount ? String(Math.round(defaultAmount)) : '')

  const amount = Math.max(0, parseFloat(raw) || 0)
  const plan = useMemo(
    () => buildAllocation(amount, budgets, goals, periodCfg),
    [amount, budgets, goals, periodCfg],
  )

  const hasPlanItems = plan.spendLines.length > 0 || plan.saveLines.length > 0
  const pctOfAvg = stats.avgPerPeriod > 0 ? Math.round((amount / stats.avgPerPeriod) * 100) : null

  const spendPct = amount > 0 ? (plan.spending / amount) * 100 : 0
  const savePct = amount > 0 ? (plan.savings / amount) * 100 : 0
  const leftPct = Math.max(0, 100 - spendPct - savePct)

  return (
    <section className="card p-5">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint">
          <Wallet size={18} className="text-emerald-700" />
        </div>
        <h2 className="font-bold">Plan your income</h2>
        <span className="ml-auto rounded-full bg-lilac/40 px-2.5 py-1 text-xs font-semibold text-muted">
          {periodLabel(periodCfg)}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted">
        Income varies? Plan any amount — a single paycheck or the whole {periodCfg.period === 'monthly' ? 'month' : 'period'} — and see where it goes.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label">Amount to plan</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
            <input
              className="input pl-8 text-lg font-bold"
              inputMode="decimal"
              placeholder="0.00"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-xs"
            onClick={() => setRaw(String(Math.round(stats.thisPeriod)))}
            disabled={stats.thisPeriod <= 0}
            title="Income logged in the current period"
          >
            This period {formatMoney(stats.thisPeriod, true)}
          </button>
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-xs"
            onClick={() => setRaw(String(Math.round(stats.avgPerPeriod)))}
            disabled={stats.avgPerPeriod <= 0}
            title="Your last 3 months of income, scaled to this period"
          >
            Avg {formatMoney(stats.avgPerPeriod, true)}
          </button>
        </div>
      </div>

      {pctOfAvg !== null && amount > 0 && (
        <p className="mt-2 text-xs text-muted">
          That's <b>{pctOfAvg}%</b> of a typical period ({formatMoney(stats.avgPerPeriod, true)}).
        </p>
      )}

      {!hasPlanItems ? (
        <div className="mt-4 rounded-2xl bg-lilac/20 p-4 text-sm text-muted">
          Add some budgets and a monthly contribution goal, and this will show exactly how a
          paycheck covers them. 🌿
        </div>
      ) : (
        <>
          <div className="mt-5 flex h-3.5 w-full overflow-hidden rounded-full bg-lilac/30">
            <div style={{ width: `${spendPct}%`, background: '#ffd6c9' }} />
            <div style={{ width: `${savePct}%`, background: '#bfe9d6' }} />
            <div style={{ width: `${leftPct}%`, background: '#e7dcff' }} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Tile icon={<TrendingDown size={16} className="text-rose-500" />} label="Spending" value={plan.spending} tint="#ffd6c9" />
            <Tile icon={<PiggyBank size={16} className="text-emerald-700" />} label="Savings" value={plan.savings} tint="#bfe9d6" />
            <Tile
              icon={<Sparkles size={16} className="text-violet-700" />}
              label={plan.leftover >= 0 ? 'Free' : 'Short'}
              value={Math.abs(plan.leftover)}
              tint="#e7dcff"
              danger={plan.leftover < 0}
            />
          </div>

          <p className="mt-3 rounded-2xl bg-cream px-4 py-3 text-sm">
            {plan.leftover >= 0 ? (
              <>
                ✨ After covering your budgets and goals, <b>{formatMoney(plan.leftover)}</b> is free
                to spend or save however you like.
              </>
            ) : (
              <>
                ⚠️ This amount is <b>{formatMoney(-plan.leftover)}</b> short of covering your budgets
                and goals — trim a budget, lower a contribution, or wait for the next paycheck.
              </>
            )}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {plan.spendLines.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Spending</p>
                <ul className="space-y-1.5">
                  {plan.spendLines.map((l) => (
                    <li key={l.label} className="flex items-center gap-2 text-sm">
                      <span>{l.emoji}</span>
                      <span className="font-medium">{l.label}</span>
                      <span className="ml-auto font-semibold text-muted">{formatMoney(l.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.saveLines.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Savings</p>
                <ul className="space-y-1.5">
                  {plan.saveLines.map((l) => (
                    <li key={l.label} className="flex items-center gap-2 text-sm">
                      <span>{l.emoji}</span>
                      <span className="font-medium">{l.label}</span>
                      <span className="ml-auto font-semibold text-muted">{formatMoney(l.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      <p className="mt-3 text-[11px] text-muted">
        Tip: amounts shown {periodLong(periodCfg)}.
      </p>

      <Windfall goals={goals} onContribute={contributeToGoal} />
    </section>
  )
}

/* ------------------------------- Windfall --------------------------------- */

function Windfall({
  goals,
  onContribute,
}: {
  goals: ReturnType<typeof useData>['goals']
  onContribute: (id: string, amount: number) => Promise<void>
}) {
  const [raw, setRaw] = useState('')
  const [done, setDone] = useState('')
  const amount = Math.max(0, parseFloat(raw) || 0)

  // Suggest the goals that most need it: behind-pace / nearest deadline first.
  const suggestions = useMemo(() => {
    return [...goals]
      .filter((g) => g.saved_amount < g.target_amount)
      .sort((a, b) => {
        const pa = goalPace(a)
        const pb = goalPace(b)
        const sa = pa?.onTrack === false ? 0 : pa ? 1 : 2
        const sb = pb?.onTrack === false ? 0 : pb ? 1 : 2
        if (sa !== sb) return sa - sb
        return a.saved_amount / a.target_amount - b.saved_amount / b.target_amount
      })
      .slice(0, 3)
  }, [goals])

  async function send(id: string, name: string) {
    if (amount <= 0) return
    await onContribute(id, amount)
    setDone(`Added ${formatMoney(amount)} to ${name} 🎉`)
    setRaw('')
    setTimeout(() => setDone(''), 3000)
  }

  return (
    <div className="mt-5 rounded-2xl border border-rose/40 bg-rose/10 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Gift size={16} className="text-rose-400" />
        <h3 className="text-sm font-bold">Got extra income?</h3>
      </div>
      <p className="mb-3 text-xs text-muted">
        Gifts, tips, a side job — plan a one-off amount separately. Best move: send it straight to a goal.
      </p>

      <div className="relative mb-3 max-w-[200px]">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
        <input
          className="input pl-8 font-bold"
          inputMode="decimal"
          placeholder="0.00"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>

      {amount > 0 && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((g) => (
            <button
              key={g.id}
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={() => send(g.id, g.name)}
            >
              <Plus size={13} /> {formatMoney(amount, true)} → {g.emoji} {g.name}
            </button>
          ))}
        </div>
      )}
      {amount > 0 && suggestions.length === 0 && (
        <p className="text-xs text-muted">Create a savings goal to send extra income toward it.</p>
      )}
      {done && <p className="mt-2 text-xs font-semibold text-emerald-600">{done}</p>}
    </div>
  )
}

function Tile({
  icon,
  label,
  value,
  tint,
  danger,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tint: string
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-lilac/40 bg-white/50 p-3">
      <div
        className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-xl"
        style={{ background: tint }}
      >
        {icon}
      </div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`text-base font-extrabold ${danger ? 'text-rose-500' : ''}`}>
        {formatMoney(value)}
      </p>
    </div>
  )
}
