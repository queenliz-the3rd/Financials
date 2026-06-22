import { Coffee, Plus, Info } from 'lucide-react'
import { formatMoney, clamp } from '../lib/format'
import { periodLabel, periodLong, type PeriodConfig } from '../lib/period'
import ProgressRing from './ProgressRing'
import type { FunMoney } from '../lib/planner'

interface Props {
  fm: FunMoney
  periodCfg: PeriodConfig
  onAddExpense: () => void
}

export default function FunMoneyCard({ fm, periodCfg, onAddExpense }: Props) {
  const negative = fm.available < 0
  // The starting pool for the period (before discretionary spending).
  const pool = fm.available + fm.unbudgetedSpend
  const fractionLeft = pool > 0 ? clamp(fm.available / pool) : negative ? 0 : 1
  const ringColor = negative ? '#ff9aa8' : '#cdb4f6'

  return (
    <section className="card animate-fade-in overflow-hidden p-0">
      <div
        className="p-5"
        style={{
          backgroundImage:
            'radial-gradient(120% 140% at 0% 0%, rgba(205,180,246,.35), transparent 55%), radial-gradient(120% 140% at 100% 0%, rgba(191,233,214,.45), transparent 55%)',
        }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Ring */}
          <div className="flex items-center gap-4">
            {fm.hasIncome ? (
              <ProgressRing value={fractionLeft} color={ringColor}>
                <span className="text-[11px] font-semibold text-muted">left</span>
                <span className={`text-lg font-extrabold leading-none ${negative ? 'text-rose-500' : 'text-ink'}`}>
                  {formatMoney(fm.available, true)}
                </span>
                {pool > 0 && (
                  <span className="mt-0.5 text-[10px] text-muted">{Math.round(fractionLeft * 100)}%</span>
                )}
              </ProgressRing>
            ) : (
              <ProgressRing value={0} color="#e3dcef">
                <span className="text-2xl">🪙</span>
              </ProgressRing>
            )}

            <div className="sm:hidden">
              <MetaHeading periodCfg={periodCfg} />
            </div>
          </div>

          {/* Text + action */}
          <div className="min-w-0 flex-1">
            <div className="hidden sm:block">
              <MetaHeading periodCfg={periodCfg} />
            </div>

            {fm.hasIncome ? (
              <p className="mt-1 text-sm text-muted">
                {negative ? (
                  <>You’re <b className="text-rose-500">{formatMoney(-fm.available)}</b> past your free-to-spend.</>
                ) : (
                  <>
                    <b className="text-ink">{formatMoney(fm.available)}</b> free to spend ·{' '}
                    {formatMoney(fm.unbudgetedSpend)} of {formatMoney(pool)} spent
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">
                Add this {periodCfg.period === 'monthly' ? 'month' : 'period'}’s income to see what’s free to spend.
              </p>
            )}

            {fm.hasIncome && (
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
                <span>{formatMoney(fm.income)} income</span>
                <span aria-hidden>−</span>
                <span>{formatMoney(fm.reservedBudgets)} budgets</span>
                <span aria-hidden>−</span>
                <span>{formatMoney(fm.reservedSavings)} savings</span>
              </div>
            )}

            <button onClick={onAddExpense} className="btn-primary mt-3">
              <Coffee size={16} />
              <Plus size={14} className="-ml-1" />
              Add expense
            </button>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted">
          <Info size={12} />
          Spending in an un-budgeted category comes out of fun money · amounts {periodLong(periodCfg)}.
        </p>
      </div>
    </section>
  )
}

function MetaHeading({ periodCfg }: { periodCfg: PeriodConfig }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">Fun money</span>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-muted">
        {periodLabel(periodCfg)}
      </span>
    </div>
  )
}
