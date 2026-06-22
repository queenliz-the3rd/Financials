import { Coffee, Plus, Info } from 'lucide-react'
import { formatMoney } from '../lib/format'
import { periodLabel, periodLong, type PeriodConfig } from '../lib/period'
import type { FunMoney } from '../lib/planner'

interface Props {
  fm: FunMoney
  periodCfg: PeriodConfig
  onAddExpense: () => void
}

export default function FunMoneyCard({ fm, periodCfg, onAddExpense }: Props) {
  const negative = fm.available < 0

  return (
    <section className="card animate-fade-in overflow-hidden p-0">
      <div
        className="p-5"
        style={{
          backgroundImage:
            'radial-gradient(120% 140% at 0% 0%, rgba(205,180,246,.35), transparent 55%), radial-gradient(120% 140% at 100% 0%, rgba(191,233,214,.45), transparent 55%)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">Fun money</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-muted">
                {periodLabel(periodCfg)}
              </span>
            </div>

            {fm.hasIncome ? (
              <>
                <p className={`mt-1 text-4xl font-extrabold leading-none ${negative ? 'text-rose-500' : 'text-ink'}`}>
                  {formatMoney(fm.available)}
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  {negative ? 'over your free-to-spend for now' : 'free to spend however you like'}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-2xl font-extrabold leading-tight text-ink">Log your income</p>
                <p className="mt-1 text-sm text-muted">
                  Add this {periodCfg.period === 'monthly' ? 'month' : 'period'}'s income to see what's free to spend.
                </p>
              </>
            )}
          </div>

          <button onClick={onAddExpense} className="btn-primary shrink-0">
            <Coffee size={16} />
            <Plus size={14} className="-ml-1" />
            Add expense
          </button>
        </div>

        {fm.hasIncome && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>{formatMoney(fm.income)} income</span>
            <span aria-hidden>−</span>
            <span>{formatMoney(fm.reservedBudgets)} budgets</span>
            <span aria-hidden>−</span>
            <span>{formatMoney(fm.reservedSavings)} savings</span>
            <span aria-hidden>−</span>
            <span>{formatMoney(fm.unbudgetedSpend)} fun spending</span>
          </div>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
          <Info size={12} />
          Spending in an un-budgeted category comes out of fun money · amounts {periodLong(periodCfg)}.
        </p>
      </div>
    </section>
  )
}
