import type { Transaction, Budget, Goal } from './types'
import { monthsUntil } from './format'
import { categoryMeta } from './categories'

/* ----------------------------- Goal deadlines ----------------------------- */

export interface GoalPace {
  monthsLeftRaw: number // can be negative (past due)
  requiredMonthly: number // needed per month to finish on time
  reached: boolean
  passed: boolean
  onTrack: boolean | null // compared to the goal's monthly_target; null if none set
  shortfall: number // requiredMonthly - monthly_target, when behind
}

export function goalPace(goal: Goal, now: Date = new Date()): GoalPace | null {
  if (!goal.deadline) return null
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount)
  const reached = remaining <= 0
  const monthsLeftRaw = monthsUntil(goal.deadline, now)
  const passed = monthsLeftRaw < 0 && !reached
  // Avoid divide-by-zero / wild numbers in the final stretch.
  const denom = Math.max(monthsLeftRaw, 0.5)
  const requiredMonthly = reached || passed ? 0 : remaining / denom

  let onTrack: boolean | null = null
  let shortfall = 0
  if (goal.monthly_target && goal.monthly_target > 0) {
    onTrack = goal.monthly_target + 1e-6 >= requiredMonthly
    shortfall = Math.max(0, requiredMonthly - goal.monthly_target)
  }
  return { monthsLeftRaw, requiredMonthly, reached, passed, onTrack, shortfall }
}

// How much has been contributed to a goal during the current month.
export function contributedThisMonth(goal: Goal, currentMonth: string): number {
  return goal.contrib_month === currentMonth ? goal.contributed_this_month ?? 0 : 0
}

/* ------------------------------ Income stats ------------------------------ */

export interface IncomeStats {
  thisMonth: number
  avgMonthly: number // rolling ~3-month average (good for variable income)
}

export function incomeStats(transactions: Transaction[], now: Date = new Date()): IncomeStats {
  const month = now.toISOString().slice(0, 7)
  const income = transactions.filter((t) => t.type === 'income')
  const thisMonth = income
    .filter((t) => t.date.slice(0, 7) === month)
    .reduce((s, t) => s + t.amount, 0)

  const since = new Date(now)
  since.setDate(since.getDate() - 90)
  const sinceISO = since.toISOString().slice(0, 10)
  const last90 = income.filter((t) => t.date >= sinceISO).reduce((s, t) => s + t.amount, 0)

  return { thisMonth, avgMonthly: last90 / 3 }
}

/* --------------------------- Income allocation ---------------------------- */

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

// Personalized: cover budget limits (spending) + goal monthly targets (savings),
// then show what's free or short. Uses the user's own numbers.
export function buildAllocation(amount: number, budgets: Budget[], goals: Goal[]): Allocation {
  const spendLines: AllocationLine[] = budgets
    .map((b) => ({
      label: b.category,
      emoji: categoryMeta(b.category).emoji,
      amount: b.limit_amount,
      kind: 'spend' as const,
    }))
    .sort((a, b) => b.amount - a.amount)

  const saveLines: AllocationLine[] = goals
    .filter((g) => g.monthly_target && g.monthly_target > 0)
    .map((g) => ({
      label: g.name,
      emoji: g.emoji,
      amount: g.monthly_target as number,
      kind: 'save' as const,
    }))
    .sort((a, b) => b.amount - a.amount)

  const spending = spendLines.reduce((s, l) => s + l.amount, 0)
  const savings = saveLines.reduce((s, l) => s + l.amount, 0)
  return { amount, spendLines, saveLines, spending, savings, leftover: amount - spending - savings }
}
