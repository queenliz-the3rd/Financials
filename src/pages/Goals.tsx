import { useState } from 'react'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import Modal from '../components/Modal'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import { useData } from '../context/DataContext'
import { formatMoney, clamp } from '../lib/format'
import { CHART_COLORS } from '../lib/categories'
import type { Goal } from '../lib/types'

const EMOJIS = ['🛟', '🗾', '🏖️', '🚗', '🏡', '💍', '🎓', '💻', '🎁', '🐶', '🌱', '✈️']

export default function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal } = useData()
  const [adding, setAdding] = useState(false)
  const [contributing, setContributing] = useState<Goal | null>(null)

  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [contribution, setContribution] = useState('')

  const totalSaved = goals.reduce((s, g) => s + g.saved_amount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const t = parseFloat(target)
    if (!name.trim() || !Number.isFinite(t) || t <= 0) return
    await addGoal({ name: name.trim(), target_amount: t, saved_amount: 0, emoji })
    setName('')
    setTarget('')
    setEmoji(EMOJIS[0])
    setAdding(false)
  }

  async function contribute(e: React.FormEvent) {
    e.preventDefault()
    if (!contributing) return
    const amt = parseFloat(contribution)
    if (!Number.isFinite(amt)) return
    const next = Math.max(0, Math.round((contributing.saved_amount + amt) * 100) / 100)
    await updateGoal(contributing.id, { saved_amount: next })
    setContribution('')
    setContributing(null)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Savings goals</h1>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus size={18} /> New
        </button>
      </header>

      {goals.length > 0 && (
        <div className="card flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lilac">
            <Sparkles size={22} className="text-violet-700" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Total saved
            </p>
            <p className="text-2xl font-extrabold">
              {formatMoney(totalSaved)}{' '}
              <span className="text-sm font-semibold text-muted">
                of {formatMoney(totalTarget)}
              </span>
            </p>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="card p-4">
          <EmptyState
            emoji="🎯"
            title="No goals yet"
            hint="Dream a little — a trip, a cushion, a treat. Set a target and watch it grow."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {goals.map((g, i) => {
            const ratio = g.target_amount ? g.saved_amount / g.target_amount : 0
            const done = ratio >= 1
            const color = CHART_COLORS[i % CHART_COLORS.length]
            return (
              <div key={g.id} className="card group p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                    style={{ background: color }}
                  >
                    {g.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{g.name}</p>
                    <p className="text-xs text-muted">
                      {formatMoney(g.saved_amount)} of {formatMoney(g.target_amount)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteGoal(g.id)}
                    className="ml-auto rounded-lg p-1.5 text-muted opacity-0 transition hover:bg-lilac/30 hover:text-rose-500 group-hover:opacity-100"
                    aria-label="Delete goal"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <ProgressBar value={ratio} color={color} />

                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`text-sm font-bold ${done ? 'text-emerald-600' : 'text-muted'}`}
                  >
                    {done ? '🎉 Reached!' : `${Math.round(clamp(ratio) * 100)}%`}
                  </span>
                  <button
                    className="btn-ghost px-3 py-1.5 text-xs"
                    onClick={() => {
                      setContribution('')
                      setContributing(g)
                    }}
                  >
                    Add money
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New goal */}
      <Modal open={adding} title="New goal" onClose={() => setAdding(false)}>
        <form onSubmit={create} className="space-y-4">
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
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-ghost flex-1" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={!name || !target}>
              Create goal
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribute */}
      <Modal
        open={!!contributing}
        title={contributing ? `Add to ${contributing.name}` : ''}
        onClose={() => setContributing(null)}
      >
        {contributing && (
          <form onSubmit={contribute} className="space-y-4">
            <p className="text-sm text-muted">
              Currently saved: <span className="font-semibold text-ink">{formatMoney(contributing.saved_amount)}</span>
              {' '}· Tip: use a negative number to withdraw.
            </p>
            <div>
              <label className="label">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input
                  className="input pl-8 text-lg font-bold"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={contribution}
                  autoFocus
                  onChange={(e) => setContribution(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[10, 25, 50, 100].map((q) => (
                <button
                  key={q}
                  type="button"
                  className="btn-ghost px-3 py-1.5 text-xs"
                  onClick={() => setContribution(String(q))}
                >
                  +{formatMoney(q, true)}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" className="btn-ghost flex-1" onClick={() => setContributing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={!contribution}>
                Save
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
