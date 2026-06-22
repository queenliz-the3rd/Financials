import { useState } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/categories'
import { todayISO } from '../lib/format'
import type { NewTransaction, TxType, Transaction } from '../lib/types'

interface Props {
  initial?: Transaction
  defaultCategory?: string
  onSubmit: (t: NewTransaction) => Promise<void> | void
  onCancel: () => void
}

export default function TransactionForm({ initial, defaultCategory, onSubmit, onCancel }: Props) {
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category ?? defaultCategory ?? 'Groceries')
  const [note, setNote] = useState(initial?.note ?? '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [saving, setSaving] = useState(false)

  const cats = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  function switchType(next: TxType) {
    setType(next)
    const list = next === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
    if (!list.some((c) => c.name === category)) setCategory(list[0].name)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0) return
    setSaving(true)
    try {
      await onSubmit({ type, amount: Math.round(value * 100) / 100, category, note: note.trim(), date })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-lilac/40 p-1">
        {(['expense', 'income'] as TxType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchType(t)}
            className={`rounded-xl py-2 text-sm font-semibold capitalize transition ${
              type === t ? 'bg-white text-ink shadow-card' : 'text-muted'
            }`}
          >
            {t === 'expense' ? '↓ Expense' : '↑ Income'}
          </button>
        ))}
      </div>

      <div>
        <label className="label">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
          <input
            className="input pl-8 text-lg font-bold"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            autoFocus
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Category</label>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Note</label>
          <input
            className="input"
            placeholder="optional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" className="btn-ghost flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={saving || !amount}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add'}
        </button>
      </div>
    </form>
  )
}
