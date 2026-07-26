import { useState } from 'react'
import { todayISO } from '../lib/format'
import type { ShoppingItem } from '../lib/types'

const DEFAULT_BUCKETS = ['Needs', 'Wants', 'Someday']

export interface ShoppingFormValues {
  name: string
  bucket: string
  price: number
  priority: 'high' | 'normal'
  deadline: string | null
  notes: string
  reserve: boolean
}

interface Props {
  initial?: ShoppingItem
  existingBuckets: string[]
  onSubmit: (v: ShoppingFormValues) => Promise<void> | void
  onCancel: () => void
}

export default function ShoppingForm({ initial, existingBuckets, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [bucket, setBucket] = useState(initial?.bucket ?? 'Needs')
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : '')
  const [priority, setPriority] = useState<'high' | 'normal'>(initial?.priority ?? 'normal')
  const [hasDeadline, setHasDeadline] = useState(!!initial?.deadline)
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [reserve, setReserve] = useState(initial?.reserve ?? false)
  const [saving, setSaving] = useState(false)

  const buckets = [...new Set([...DEFAULT_BUCKETS, ...existingBuckets])]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !bucket.trim()) return
    const p = parseFloat(price)
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        bucket: bucket.trim(),
        price: Number.isFinite(p) && p > 0 ? Math.round(p * 100) / 100 : 0,
        priority,
        deadline: hasDeadline && deadline ? deadline : null,
        notes: notes.trim(),
        reserve,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">What do you need?</label>
        <input
          className="input"
          placeholder="e.g. Winter boots"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Bucket</label>
        <div className="mb-2 flex flex-wrap gap-2">
          {buckets.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBucket(b)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                bucket === b
                  ? 'border-transparent bg-lavender text-white shadow-card'
                  : 'border-lilac/60 bg-white/60 text-muted hover:text-ink'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="…or type a new bucket"
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Est. price</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
            <input
              className="input pl-8 font-bold"
              inputMode="decimal"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Priority</label>
          <div className="flex gap-1 rounded-2xl bg-lilac/40 p-1">
            {(['normal', 'high'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition ${
                  priority === p ? 'bg-white text-ink shadow-card' : 'text-muted'
                }`}
              >
                {p === 'high' ? '🔴 High' : 'Normal'}
              </button>
            ))}
          </div>
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
          Buy-by deadline
        </label>
        {hasDeadline && (
          <input
            type="date"
            className="input mt-2 animate-fade-in"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-2 rounded-2xl bg-mint/20 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-lavender"
          checked={reserve}
          onChange={(e) => setReserve(e.target.checked)}
        />
        <span>
          <span className="font-semibold">Set this money aside now</span>
          <span className="block text-muted">
            Lowers your “free to spend” by the price now, before you buy it.
          </span>
        </span>
      </label>

      <div>
        <label className="label">Notes (optional)</label>
        <input
          className="input"
          placeholder="link, size, color…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" className="btn-ghost flex-1" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={saving || !name || !bucket}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add item'}
        </button>
      </div>
    </form>
  )
}
