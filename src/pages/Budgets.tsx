import { useMemo, useState } from 'react'
import { Plus, Trash2, CalendarRange } from 'lucide-react'
import Modal from '../components/Modal'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import IncomePlanner from '../components/IncomePlanner'
import { useData } from '../context/DataContext'
import { EXPENSE_CATEGORIES, categoryMeta } from '../lib/categories'
import { formatMoney, clamp } from '../lib/format'
import { contributedThisPeriod } from '../lib/planner'
import {
  currentPeriodRange,
  currentPeriodKey,
  periodLabel,
  periodShort,
  toPeriodAmount,
  fromPeriodAmount,
} from '../lib/period'

export default function Budgets() {
  const { budgets, goals, shopping, addBudget, deleteBudget, periodCfg, updateSettings } = useData()
  const { transactions } = useData()
  const [adding, setAdding] = useState(false)
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name)
  const [limit, setLimit] = useState('')

  const unit = periodShort(periodCfg)
  const periodKey = currentPeriodKey(periodCfg)

  // Spending within the current period window.
  const spentByCat = useMemo(() => {
    const { start, end } = currentPeriodRange(periodCfg)
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== 'expense') continue
      if (t.date < start || t.date >= end) continue
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return map
  }, [transactions, periodCfg])

  const usedCats = new Set(budgets.map((b) => b.category))
  const available = EXPENSE_CATEGORIES.filter((c) => !usedCats.has(c.name))

  // Savings goals shown as budget lines.
  const savingLines = goals
    .filter((g) => g.monthly_target && g.monthly_target > 0)
    .map((g) => ({
      goal: g,
      target: toPeriodAmount(g.monthly_target as number, periodCfg),
      contributed: contributedThisPeriod(g, periodKey),
    }))

  const spendLimit = budgets.reduce((s, b) => s + toPeriodAmount(b.limit_amount, periodCfg), 0)
  const spendUsed = budgets.reduce((s, b) => s + (spentByCat.get(b.category) ?? 0), 0)
  const saveTarget = savingLines.reduce((s, l) => s + l.target, 0)
  const saveUsed = savingLines.reduce((s, l) => s + l.contributed, 0)
  const totalLimit = spendLimit + saveTarget
  const totalUsed = spendUsed + saveUsed

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const value = parseFloat(limit)
    if (!Number.isFinite(value) || value <= 0) return
    // The user enters a per-period limit; store it as a canonical monthly amount.
    await addBudget({ category, limit_amount: Math.round(fromPeriodAmount(value, periodCfg) * 100) / 100 })
    setLimit('')
    setAdding(false)
  }

  function openAdd() {
    setCategory(available[0]?.name ?? EXPENSE_CATEGORIES[0].name)
    setLimit('')
    setAdding(true)
  }

  const nothingYet = budgets.length === 0 && savingLines.length === 0

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{periodLabel(periodCfg)}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Budgets</h1>
        </div>
        <button className="btn-primary" onClick={openAdd} disabled={available.length === 0}>
          <Plus size={18} /> New
        </button>
      </header>

      <PeriodBar />

      <IncomePlanner />

      {!nothingYet && (
        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">Total budgeted</span>
            <span className="text-muted">
              {formatMoney(totalUsed)} of {formatMoney(totalLimit)} / {unit}
            </span>
          </div>
          <ProgressBar value={totalLimit ? totalUsed / totalLimit : 0} over={totalUsed > totalLimit} />
          <p className="mt-2 text-xs text-muted">
            {formatMoney(spendLimit)} spending · {formatMoney(saveTarget)} savings
          </p>
        </div>
      )}

      {nothingYet ? (
        <div className="card p-4">
          <EmptyState
            emoji="🪴"
            title="No budgets yet"
            hint="Set a limit for a category, or add a monthly contribution goal — both show up here."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {budgets.map((b) => {
            const periodLimit = toPeriodAmount(b.limit_amount, periodCfg)
            const spent = spentByCat.get(b.category) ?? 0
            const ratio = periodLimit ? spent / periodLimit : 0
            const over = ratio > 1
            const m = categoryMeta(b.category)
            return (
              <div key={b.id} className="card group p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
                    style={{ background: m.color }}
                  >
                    {m.emoji}
                  </span>
                  <div>
                    <p className="font-bold">{b.category}</p>
                    <p className="text-xs text-muted">
                      {formatMoney(periodLimit)} / {unit}
                    </p>
                  </div>
                  <span className={`ml-auto text-sm font-bold ${over ? 'text-rose-500' : 'text-muted'}`}>
                    {Math.round(clamp(ratio, 0, 99) * 100)}%
                  </span>
                  <button
                    onClick={() => deleteBudget(b.id)}
                    className="rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-lilac/30 hover:text-rose-500 group-hover:opacity-100"
                    aria-label="Delete budget"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <ProgressBar value={ratio} color={m.color} over={over} />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted">{formatMoney(spent)} spent</span>
                  <span className={over ? 'font-semibold text-rose-500' : 'text-muted'}>
                    {over
                      ? `${formatMoney(spent - periodLimit)} over`
                      : `${formatMoney(periodLimit - spent)} left`}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Savings goals as budget lines */}
          {savingLines.map(({ goal, target, contributed }) => {
            const ratio = target ? contributed / target : 0
            return (
              <div key={goal.id} className="card p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint text-xl">
                    {goal.emoji}
                  </span>
                  <div>
                    <p className="font-bold">{goal.name}</p>
                    <p className="text-xs text-emerald-700">
                      savings · {formatMoney(target)} / {unit}
                    </p>
                  </div>
                  <span className="ml-auto text-sm font-bold text-muted">
                    {Math.round(clamp(ratio, 0, 99) * 100)}%
                  </span>
                </div>
                <ProgressBar value={ratio} color="#bfe9d6" />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted">{formatMoney(contributed)} added</span>
                  <span className="text-muted">
                    {contributed >= target
                      ? 'goal met 🎉'
                      : `${formatMoney(target - contributed)} to go`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PlannedPurchases />

      <Modal open={adding} title="New budget" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Category</label>
            <div className="flex flex-wrap gap-2">
              {available.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCategory(c.name)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                    category === c.name
                      ? 'border-transparent text-ink shadow-card'
                      : 'border-lilac/60 bg-white/60 text-muted hover:text-ink'
                  }`}
                  style={category === c.name ? { background: c.color } : undefined}
                >
                  <span>{c.emoji}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Limit per {unit}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
              <input
                className="input pl-8 text-lg font-bold"
                inputMode="decimal"
                placeholder="0.00"
                value={limit}
                autoFocus
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-ghost flex-1" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={!limit}>
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )

  function PlannedPurchases() {
    const open = shopping.filter((s) => !s.purchased && (s.price || 0) > 0)
    if (open.length === 0) return null
    const total = open.reduce((s, i) => s + i.price, 0)
    const reserved = open.filter((i) => i.reserve).reduce((s, i) => s + i.price, 0)

    // group by bucket
    const byBucket = new Map<string, typeof open>()
    for (const i of open) {
      const list = byBucket.get(i.bucket) ?? []
      list.push(i)
      byBucket.set(i.bucket, list)
    }

    return (
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Planned purchases</h2>
          <span className="text-sm text-muted">
            {formatMoney(total)}
            {reserved > 0 && <span className="text-emerald-700"> · {formatMoney(reserved)} set aside</span>}
          </span>
        </div>
        <div className="space-y-4">
          {[...byBucket.entries()].map(([bucket, items]) => (
            <div key={bucket}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{bucket}</p>
              <ul className="space-y-1.5">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 text-sm">
                    {i.priority === 'high' && <span title="High priority">🔴</span>}
                    <span className="font-medium">{i.name}</span>
                    {i.reserve && (
                      <span className="rounded-full bg-mint/50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        set aside
                      </span>
                    )}
                    <span className="ml-auto font-semibold text-muted">{formatMoney(i.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Manage these on the <b>To Buy</b> tab. “Set aside” items already lower your fun money.
        </p>
      </section>
    )
  }

  function PeriodBar() {
    return (
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarRange size={16} className="text-lavender" />
            Budgeting period
          </div>
          <div className="flex gap-1 rounded-2xl bg-lilac/40 p-1">
            {(['monthly', 'biweekly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => updateSettings({ budget_period: p })}
                className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold capitalize transition ${
                  periodCfg.period === p ? 'bg-white text-ink shadow-card' : 'text-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {periodCfg.period === 'biweekly' && (
          <div className="mt-3 flex flex-wrap items-center gap-3 animate-fade-in">
            <div className="flex gap-1 rounded-2xl bg-lilac/40 p-1 text-xs">
              <button
                onClick={() => updateSettings({ biweekly_style: 'semimonthly' })}
                className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                  periodCfg.biweeklyStyle === 'semimonthly' ? 'bg-white text-ink shadow-card' : 'text-muted'
                }`}
              >
                Twice a month
              </button>
              <button
                onClick={() => updateSettings({ biweekly_style: 'every14' })}
                className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                  periodCfg.biweeklyStyle === 'every14' ? 'bg-white text-ink shadow-card' : 'text-muted'
                }`}
              >
                Every 14 days
              </button>
            </div>
            {periodCfg.biweeklyStyle === 'every14' && (
              <label className="flex items-center gap-2 text-xs text-muted">
                starts
                <input
                  type="date"
                  className="input w-auto py-1.5 text-xs"
                  value={periodCfg.cycleStart}
                  onChange={(e) => updateSettings({ cycle_start: e.target.value })}
                />
              </label>
            )}
            <span className="text-xs text-muted">Amounts auto-convert when you switch.</span>
          </div>
        )}
      </div>
    )
  }
}
