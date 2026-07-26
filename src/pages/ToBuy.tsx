import { useMemo, useState } from 'react'
import { Plus, Trash2, Pencil, Check, CalendarClock, Lock, ChevronDown } from 'lucide-react'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import ShoppingForm from '../components/ShoppingForm'
import { useData } from '../context/DataContext'
import { formatMoney, formatFullDate, countdown, todayISO } from '../lib/format'
import type { ShoppingItem } from '../lib/types'

export default function ToBuy() {
  const { shopping, addShopping, updateShopping, deleteShopping, purchaseShopping } = useData()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [showPurchased, setShowPurchased] = useState(false)

  const today = todayISO()
  const open = shopping.filter((s) => !s.purchased)
  const purchased = shopping.filter((s) => s.purchased)

  const existingBuckets = [...new Set(shopping.map((s) => s.bucket))]
  const toBuyTotal = open.reduce((s, i) => s + (i.price || 0), 0)
  const reservedTotal = open.filter((i) => i.reserve).reduce((s, i) => s + (i.price || 0), 0)

  // Group open items by bucket, sorted: high priority first, then soonest deadline.
  const groups = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>()
    for (const item of open) {
      const list = map.get(item.bucket) ?? []
      list.push(item)
      map.set(item.bucket, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
        if (a.deadline) return -1
        if (b.deadline) return 1
        return 0
      })
    }
    return [...map.entries()]
  }, [open])

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">To buy</h1>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus size={18} /> New
        </button>
      </header>

      {open.length > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">To buy</p>
            <p className="text-2xl font-extrabold">{formatMoney(toBuyTotal)}</p>
            <p className="text-xs text-muted">{open.length} item{open.length === 1 ? '' : 's'}</p>
          </div>
          {reservedTotal > 0 && (
            <div className="rounded-2xl bg-mint/30 px-4 py-3 text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <Lock size={14} /> {formatMoney(reservedTotal)} set aside
              </span>
              <span className="text-xs text-muted">already subtracted from fun money</span>
            </div>
          )}
        </div>
      )}

      {open.length === 0 && purchased.length === 0 ? (
        <div className="card p-4">
          <EmptyState
            emoji="🛍️"
            title="Nothing on your list"
            hint="Add things you need or want to buy, sort them into buckets, and set deadlines."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([bucket, items]) => {
            const bucketTotal = items.reduce((s, i) => s + (i.price || 0), 0)
            return (
              <section key={bucket}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="font-bold">{bucket}</h2>
                  <span className="text-sm font-semibold text-muted">{formatMoney(bucketTotal)}</span>
                </div>
                <ul className="card divide-y divide-lilac/30 overflow-hidden p-1.5">
                  {items.map((item) => {
                    const overdue = item.deadline && item.deadline < today
                    const soon =
                      item.deadline &&
                      !overdue &&
                      item.deadline <=
                        new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
                    return (
                      <li key={item.id} className="group flex items-start gap-3 rounded-2xl px-2.5 py-2.5">
                        <button
                          onClick={() => purchaseShopping(item.id)}
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-lilac text-transparent transition hover:border-lavender hover:bg-lavender hover:text-white"
                          title="Mark as bought"
                          aria-label="Mark as bought"
                        >
                          <Check size={14} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {item.priority === 'high' && <span title="High priority">🔴</span>}
                            <span className="truncate font-semibold">{item.name}</span>
                            {item.reserve && (
                              <span className="flex items-center gap-0.5 rounded-full bg-mint/50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                <Lock size={10} /> set aside
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                            {item.deadline && (
                              <span
                                className={`flex items-center gap-1 ${
                                  overdue ? 'font-semibold text-rose-500' : soon ? 'font-semibold text-amber-600' : ''
                                }`}
                              >
                                <CalendarClock size={12} />
                                {overdue ? 'overdue' : formatFullDate(item.deadline)} · {countdown(item.deadline)}
                              </span>
                            )}
                            {item.notes && <span className="truncate">· {item.notes}</span>}
                          </div>
                        </div>

                        <span className="shrink-0 font-bold">{item.price ? formatMoney(item.price) : ''}</span>

                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => setEditing(item)}
                            className="rounded-lg p-1.5 text-muted hover:bg-lilac/30 hover:text-ink"
                            aria-label="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => deleteShopping(item.id)}
                            className="rounded-lg p-1.5 text-muted hover:bg-lilac/30 hover:text-rose-500"
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

          {/* Purchased */}
          {purchased.length > 0 && (
            <section>
              <button
                onClick={() => setShowPurchased((v) => !v)}
                className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-muted hover:text-ink"
              >
                <ChevronDown
                  size={16}
                  className={`transition ${showPurchased ? '' : '-rotate-90'}`}
                />
                Purchased ({purchased.length})
              </button>
              {showPurchased && (
                <ul className="card divide-y divide-lilac/30 overflow-hidden p-1.5">
                  {purchased.map((item) => (
                    <li key={item.id} className="group flex items-center gap-3 rounded-2xl px-2.5 py-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint text-emerald-700">
                        <Check size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="truncate font-medium text-muted line-through">{item.name}</span>
                        <span className="ml-2 text-xs text-muted">{item.bucket}</span>
                      </div>
                      <span className="shrink-0 text-sm text-muted">
                        {item.price ? formatMoney(item.price) : ''}
                      </span>
                      <button
                        onClick={() => deleteShopping(item.id)}
                        className="rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-lilac/30 hover:text-rose-500 group-hover:opacity-100"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {/* Add */}
      <Modal open={adding} title="Add to your list" onClose={() => setAdding(false)}>
        <ShoppingForm
          existingBuckets={existingBuckets}
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            await addShopping({ ...v, purchased: false, purchased_at: null })
            setAdding(false)
          }}
        />
      </Modal>

      {/* Edit */}
      <Modal open={!!editing} title="Edit item" onClose={() => setEditing(null)}>
        {editing && (
          <ShoppingForm
            initial={editing}
            existingBuckets={existingBuckets}
            onCancel={() => setEditing(null)}
            onSubmit={async (v) => {
              await updateShopping(editing.id, v)
              setEditing(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
