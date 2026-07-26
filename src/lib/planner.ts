import type { Transaction, Budget, Goal, ShoppingItem } from './types'
import { monthsUntil } from './format'
import { categoryMeta } from './categories'
import {
  type PeriodConfig,
  currentPeriodRange,
  toPeriodAmount,
} from './period'

/* ----------------------------- Goal deadlines ----------------------------- */

export interface GoalPace {
  monthsLeftRaw: number // can be negative (past due)
  requiredMonthly: number // needed per month to finish on time
  reached: boolean
  passed: boolean
  notStarted: boolean // saving hasn't begun yet (future start date)
  onTrack: boolean | null // compared to the goal's monthly_target; null if none set
  shortfall: number // requiredMonthly - monthly_target, when behind
}

export function goalPace(goal: Goal, now: Date = new Date()): GoalPace | null {
  if (!goal.deadline) return null
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount)
  const reached = remaining <= 0

  // Spread the remaining amount over the window from when saving starts to the
  // deadline. A future start date means you have until then before contributing.
  const startDate = goal.start_date ? new Date(goal.start_date + 'T00:00:00') : now
  const notStarted = startDate.getTime() > now.getTime()
  const effectiveStart = notStarted ? startDate : now

  const monthsLeftRaw = monthsUntil(goal.deadline, effectiveStart)
  const passed = monthsLeftRaw < 0 && !reached
  const denom = Math.max(monthsLeftRaw, 0.5)
  const requiredMonthly = reached || passed ? 0 : remaining / denom

  let onTrack: boolean | null = null
  let shortfall = 0
  if (goal.monthly_target && goal.monthly_target > 0) {
    onTrack = goal.monthly_target + 1e-6 >= requiredMonthly
    shortfall = Math.max(0, requiredMonthly - goal.monthly_target)
  }
  return { monthsLeftRaw, requiredMonthly, reached, passed, notStarted, onTrack, shortfall }
}

// How much has been contributed to a goal during the current period.
export function contributedThisPeriod(goal: Goal, periodKey: string): number {
  return goal.contrib_period === periodKey ? goal.contributed_this_month ?? 0 : 0
}

/* ------------------------------ Income stats ------------------------------ */

export interface IncomeStats {
  thisPeriod: number // income logged in the current period
  avgPerPeriod: number // rolling 3-month average, scaled to the current period
}

export function incomeStats(
  transactions: Transaction[],
  cfg: PeriodConfig,
  now: Date = new Date(),
): IncomeStats {
  const income = transactions.filter((t) => t.type === 'income')
  const { start, end } = currentPeriodRange(cfg, now)
  const thisPeriod = income
    .filter((t) => t.date >= start && t.date < end)
    .reduce((s, t) => s + t.amount, 0)

  const since = new Date(now)
  since.setDate(since.getDate() - 90)
  const sinceISO = since.toISOString().slice(0, 10)
  const last90 = income.filter((t) => t.date >= sinceISO).reduce((s, t) => s + t.amount, 0)
  const avgMonthly = last90 / 3

  return { thisPeriod, avgPerPeriod: toPeriodAmount(avgMonthly, cfg) }
}

// Personalized: cover budget limits (spending) + goal targets (savings) for the

export interface AllocationLine {
  label: string
  emoji: string
  amount: number
  kind: 'spend' | 'save'
}

export interface Allocation {
  amount: number
  spendLines: AllocationLine[]
  saveLines: AllocationLine[]
  spending: number
  savings: number
  leftover: number // positive = free; negative = short
}

/* ------------------------------- Fun money -------------------------------- */

export interface FunMoney {
  income: number
  reservedBudgets: number
  reservedSavings: number
  reservedPurchases: number
  unbudgetedSpend: number
  available: number
  hasIncome: boolean
}

// "Free to spend" for the current period:
//   income − reserved budgets − reserved savings − reserved purchases − un-budgeted spend
// Spending in a budgeted category comes out of that budget (not fun money);
// only spending in categories WITHOUT a budget draws fun money down. Shopping
// items marked "set aside" reserve their price until bought.
export function funMoney(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
  shopping: ShoppingItem[],
  cfg: PeriodConfig,
  now: Date = new Date(),
): FunMoney {
  const { start, end } = currentPeriodRange(cfg, now)
  const inPeriod = (d: string) => d >= start && d < end
  const budgetedCats = new Set(budgets.map((b) => b.category))

  const income = transactions
    .filter((t) => t.type === 'income' && inPeriod(t.date))
    .reduce((s, t) => s + t.amount, 0)

  const reservedBudgets = budgets.reduce((s, b) => s + toPeriodAmount(b.limit_amount, cfg), 0)
  const reservedSavings = goals
    .filter((g) => g.monthly_target && g.monthly_target > 0)
    .reduce((s, g) => s + toPeriodAmount(g.monthly_target as number, cfg), 0)
  const reservedPurchases = shopping
    .filter((s) => s.reserve && !s.purchased)
    .reduce((s, i) => s + (i.price || 0), 0)
  const unbudgetedSpend = transactions
    .filter((t) => t.type === 'expense' && inPeriod(t.date) && !budgetedCats.has(t.category))
    .reduce((s, t) => s + t.amount, 0)

  return {
    income,
    reservedBudgets,
    reservedSavings,
    reservedPurchases,
    unbudgetedSpend,
    available: income - reservedBudgets - reservedSavings - reservedPurchases - unbudgetedSpend,
    hasIncome: income > 0,
  }
}

/* --------------------------- Income allocation ---------------------------- */

// Personalized: cover budget limits (spending) + goal targets (savings) for the
// active period, then show what's free or short. Uses the user's own numbers.
export function buildAllocation(
  amount: number,
  budgets: Budget[],
  goals: Goal[],
  cfg: PeriodConfig,
): Allocation {
  const spendLines: AllocationLine[] = budgets
    .map((b) => ({
      label: b.category,
      emoji: categoryMeta(b.category).emoji,
      amount: toPeriodAmount(b.limit_amount, cfg),
      kind: 'spend' as const,
    }))
    .sort((a, b) => b.amount - a.amount)

  const saveLines: AllocationLine[] = goals
    .filter((g) => g.monthly_target && g.monthly_target > 0)
    .map((g) => ({
      label: g.name,
      emoji: g.emoji,
      amount: toPeriodAmount(g.monthly_target as number, cfg),
      kind: 'save' as const,
    }))
    .sort((a, b) => b.amount - a.amount)

  const spending = spendLines.reduce((s, l) => s + l.amount, 0)
  const savings = saveLines.reduce((s, l) => s + l.amount, 0)
  return { amount, spendLines, saveLines, spending, savings, leftover: amount - spending - savings }
}
