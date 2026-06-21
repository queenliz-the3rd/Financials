import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import TransactionForm from '../components/TransactionForm'
import { useData } from '../context/DataContext'
import { categoryMeta } from '../lib/categories'
import { formatMoney, prettyDate } from '../lib/format'
import type { Transaction, TxType } from '../lib/types'

type Filter = 'all' | TxType

export default function Transactions() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useData()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const filtered = transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (query) {
        const q = query.toLowerCase()
        if (!t.note.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q))
          return false
      }
      return true
    })
    const byDate = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const list = byDate.get(t.date) ?? []
      list.push(t)
      byDate.set(t.date, list)
    }
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions, filter, query])

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Activity</h1>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus size={18} /> Add
        </button>
      </header>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10"
            placeholder="Search notes or categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 rounded-2xl bg-lilac/40 p-1">
          {(['all', 'expense', 'income'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold capitalize transition ${
                filter === f ? 'bg-white text-ink shadow-card' : 'text-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card p-4">
          <EmptyState
            emoji="🔍"
            title="No transactions found"
            hint="Try a different search or add your first one."
          />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, items]) => {
            const dayTotal = items.reduce(
              (s, t) => s + (t.type === 'income' ? t.amount : -t.amount),
              0,
            )
            return (
              <section key={date}>
                <div className="mb-1.5 flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
                    {prettyDate(date)}
                  </h3>
                  <span className="text-xs font-semibold text-muted">
                    {dayTotal >= 0 ? '+' : '–'}
                    {formatMoney(Math.abs(dayTotal))}
                  </span>
                </div>
                <ul className="card divide-y divide-lilac/30 overflow-hidden p-1.5">
                  {items.map((t) => {
                    const m = categoryMeta(t.category)
                    return (
                      <li
                        key={t.id}
                        className="group flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition hover:bg-lilac/20"
                      >
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                          style={{ background: m.color }}
                        >
                          {m.emoji}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{t.note || t.category}</p>
                          <p className="text-xs text-muted">{t.category}</p>
                        </div>
                        <span
                          className={`ml-auto text-sm font-bold ${
                            t.type === 'income' ? 'text-emerald-600' : 'text-ink'
                          }`}
                        >
                          {t.type === 'income' ? '+' : '–'}
                          {formatMoney(t.amount)}
                        </span>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => setEditing(t)}
                            className="rounded-lg p-1.5 text-muted hover:bg-white hover:text-ink"
                            aria-label="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => deleteTransaction(t.id)}
                            className="rounded-lg p-1.5 text-muted hover:bg-white hover:text-rose-500"
                            aria-label="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <Modal open={adding} title="Add transaction" onClose={() => setAdding(false)}>
        <TransactionForm
          onCancel={() => setAdding(false)}
          onSubmit={async (t) => {
            await addTransaction(t)
            setAdding(false)
          }}
        />
      </Modal>

      <Modal open={!!editing} title="Edit transaction" onClose={() => setEditing(null)}>
        {editing && (
          <TransactionForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (t) => {
              await updateTransaction(editing.id, t)
              setEditing(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
