import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import { useData, useMonthStats } from '../context/DataContext'
import { EXPENSE_CATEGORIES, categoryMeta } from '../lib/categories'
import { formatMoney, monthLabel, currentMonthKey, clamp } from '../lib/format'

export default function Budgets() {
  const { budgets, addBudget, deleteBudget } = useData()
  const stats = useMonthStats()
  const [adding, setAdding] = useState(false)
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name)
  const [limit, setLimit] = useState('')

  const spentByCat = new Map(stats.spendingByCategory.map((s) => [s.category, s.amount]))
  const usedCats = new Set(budgets.map((b) => b.category))
  const available = EXPENSE_CATEGORIES.filter((c) => !usedCats.has(c.name))

  const totalLimit = budgets.reduce((s, b) => s + b.limit_amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + (spentByCat.get(b.category) ?? 0), 0)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const value = parseFloat(limit)
    if (!Number.isFinite(value) || value <= 0) return
    await addBudget({ category, limit_amount: Math.round(value * 100) / 100 })
    setLimit('')
    setAdding(false)
  }

  function openAdd() {
    setCategory(available[0]?.name ?? EXPENSE_CATEGORIES[0].name)
    setLimit('')
    setAdding(true)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{monthLabel(currentMonthKey())}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Budgets</h1>
        </div>
        <button className="btn-primary" onClick={openAdd} disabled={available.length === 0}>
          <Plus size={18} /> New
        </button>
      </header>

      {budgets.length > 0 && (
        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">Total budgeted</span>
            <span className="text-muted">
              {formatMoney(totalSpent)} of {formatMoney(totalLimit)}
            </span>
          </div>
          <ProgressBar value={totalLimit ? totalSpent / totalLimit : 0} over={totalSpent > totalLimit} />
          <p className="mt-2 text-xs text-muted">
            {totalSpent <= totalLimit
              ? `${formatMoney(totalLimit - totalSpent)} left to spend 🌿`
              : `${formatMoney(totalSpent - totalLimit)} over budget`}
          </p>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="card p-4">
          <EmptyState
            emoji="🪴"
            title="No budgets yet"
            hint="Set a monthly limit for a category to keep spending gentle and intentional."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {budgets.map((b) => {
            const spent = spentByCat.get(b.category) ?? 0
            const ratio = spent / b.limit_amount
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
                      {formatMoney(b.limit_amount)} / month
                    </p>
                  </div>
                  <span
                    className={`ml-auto text-sm font-bold ${over ? 'text-rose-500' : 'text-muted'}`}
                  >
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
                      ? `${formatMoney(spent - b.limit_amount)} over`
                      : `${formatMoney(b.limit_amount - spent)} left`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
            <label className="label">Monthly limit</label>
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
}
