import { useMemo, useState } from 'react'
import { Wallet, TrendingDown, PiggyBank, Sparkles } from 'lucide-react'
import { useData } from '../context/DataContext'
import { incomeStats, buildAllocation } from '../lib/planner'
import { formatMoney, monthLabel, currentMonthKey } from '../lib/format'

// Income planner built for irregular income: it reads your actual logged income
// (this month + a rolling 3-month average) and lets you plan any amount — like a
// single paycheck — across your budgets and goals.
export default function IncomePlanner() {
  const { transactions, budgets, goals } = useData()
  const stats = useMemo(() => incomeStats(transactions), [transactions])

  // Default to what you've actually earned this month, falling back to your average.
  const defaultAmount = stats.thisMonth > 0 ? stats.thisMonth : Math.round(stats.avgMonthly)
  const [raw, setRaw] = useState<string>(defaultAmount ? String(defaultAmount) : '')

  const amount = Math.max(0, parseFloat(raw) || 0)
  const plan = useMemo(() => buildAllocation(amount, budgets, goals), [amount, budgets, goals])

  const hasPlanItems = plan.spendLines.length > 0 || plan.saveLines.length > 0
  const pctOfAvg = stats.avgMonthly > 0 ? Math.round((amount / stats.avgMonthly) * 100) : null

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
      </div>
      <p className="mb-4 text-xs text-muted">
        Income varies? Plan any amount — a single paycheck or the whole month — and see where it goes.
      </p>

      {/* Amount input + quick fills */}
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
            onClick={() => setRaw(String(Math.round(stats.thisMonth)))}
            disabled={stats.thisMonth <= 0}
            title={`Income logged in ${monthLabel(currentMonthKey())}`}
          >
            This month {formatMoney(stats.thisMonth, true)}
          </button>
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-xs"
            onClick={() => setRaw(String(Math.round(stats.avgMonthly)))}
            disabled={stats.avgMonthly <= 0}
            title="Average of your last 3 months of income"
          >
            Avg month {formatMoney(stats.avgMonthly, true)}
          </button>
        </div>
      </div>

      {pctOfAvg !== null && amount > 0 && (
        <p className="mt-2 text-xs text-muted">
          That's <b>{pctOfAvg}%</b> of your average month ({formatMoney(stats.avgMonthly, true)}).
        </p>
      )}

      {!hasPlanItems ? (
        <div className="mt-4 rounded-2xl bg-lilac/20 p-4 text-sm text-muted">
          Add some budgets and a monthly contribution goal, and this will show exactly how a
          paycheck covers them. 🌿
        </div>
      ) : (
        <>
          {/* Stacked allocation bar */}
          <div className="mt-5 flex h-3.5 w-full overflow-hidden rounded-full bg-lilac/30">
            <div style={{ width: `${spendPct}%`, background: '#ffd6c9' }} />
            <div style={{ width: `${savePct}%`, background: '#bfe9d6' }} />
            <div style={{ width: `${leftPct}%`, background: '#e7dcff' }} />
          </div>

          {/* Summary tiles */}
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

          {/* Line-by-line breakdown */}
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
    </section>
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
