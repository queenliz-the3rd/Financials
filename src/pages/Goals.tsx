import { useState } from 'react'
import { Plus, Trash2, Sparkles, Pencil, CalendarClock, CheckCircle2, AlertTriangle } from 'lucide-react'
import Modal from '../components/Modal'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import GoalForm from '../components/GoalForm'
import { useData } from '../context/DataContext'
import { formatMoney, clamp, formatFullDate, countdown } from '../lib/format'
import { goalPace, contributedThisPeriod } from '../lib/planner'
import { currentPeriodKey, toPeriodAmount, periodShort } from '../lib/period'
import { CHART_COLORS } from '../lib/categories'
import type { Goal } from '../lib/types'

export default function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal, contributeToGoal, periodCfg } = useData()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [contributing, setContributing] = useState<Goal | null>(null)
  const [contribution, setContribution] = useState('')

  const periodKey = currentPeriodKey(periodCfg)
  const unit = periodShort(periodCfg)
  const totalSaved = goals.reduce((s, g) => s + g.saved_amount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)

  async function contribute(e: React.FormEvent) {
    e.preventDefault()
    if (!contributing) return
    const amt = parseFloat(contribution)
    if (!Number.isFinite(amt)) return
    await contributeToGoal(contributing.id, amt)
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
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Total saved</p>
            <p className="text-2xl font-extrabold">
              {formatMoney(totalSaved)}{' '}
              <span className="text-sm font-semibold text-muted">of {formatMoney(totalTarget)}</span>
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
            const pace = goalPace(g)
            const periodTarget = g.monthly_target ? toPeriodAmount(g.monthly_target, periodCfg) : 0
            const contributed = contributedThisPeriod(g, periodKey)
            return (
              <div key={g.id} className="card group flex flex-col p-5">
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
                  <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => setEditing(g)}
                      className="rounded-lg p-1.5 text-muted hover:bg-lilac/30 hover:text-ink"
                      aria-label="Edit goal"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteGoal(g.id)}
                      className="rounded-lg p-1.5 text-muted hover:bg-lilac/30 hover:text-rose-500"
                      aria-label="Delete goal"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <ProgressBar value={ratio} color={color} />

                {/* Deadline pace */}
                {pace && !done && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="flex items-center gap-1 text-muted">
                      <CalendarClock size={13} />
                      {formatFullDate(g.deadline as string)} · {countdown(g.deadline as string)}
                    </span>
                    {pace.passed ? (
                      <span className="font-semibold text-rose-500">deadline passed</span>
                    ) : (
                      <>
                        <span className="font-semibold text-ink">
                          save {formatMoney(toPeriodAmount(pace.requiredMonthly, periodCfg))}/{unit}
                          {g.auto_contribution && ' (auto)'}
                        </span>
                        {pace.onTrack === true && (
                          <span className="flex items-center gap-0.5 font-semibold text-emerald-600">
                            <CheckCircle2 size={13} /> on track
                          </span>
                        )}
                        {pace.onTrack === false && (
                          <span className="flex items-center gap-0.5 font-semibold text-amber-600">
                            <AlertTriangle size={13} /> behind {formatMoney(toPeriodAmount(pace.shortfall, periodCfg))}/{unit}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Period contribution progress */}
                {periodTarget > 0 && !done && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted">This period's contribution</span>
                      <span className="font-semibold">
                        {formatMoney(contributed)} / {formatMoney(periodTarget)}
                      </span>
                    </div>
                    <ProgressBar value={contributed / periodTarget} color="#bfe9d6" />
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between pt-1">
                  <span className={`text-sm font-bold ${done ? 'text-emerald-600' : 'text-muted'}`}>
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
        <GoalForm
          periodCfg={periodCfg}
          onCancel={() => setAdding(false)}
          onSubmit={async (v) => {
            await addGoal({
              ...v,
              saved_amount: 0,
              contributed_this_month: 0,
              contrib_period: '',
            })
            setAdding(false)
          }}
        />
      </Modal>

      {/* Edit goal */}
      <Modal open={!!editing} title="Edit goal" onClose={() => setEditing(null)}>
        {editing && (
          <GoalForm
            initial={editing}
            periodCfg={periodCfg}
            onCancel={() => setEditing(null)}
            onSubmit={async (v) => {
              await updateGoal(editing.id, v)
              setEditing(null)
            }}
          />
        )}
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
              Currently saved:{' '}
              <span className="font-semibold text-ink">{formatMoney(contributing.saved_amount)}</span> · Tip:
              use a negative number to withdraw.
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
