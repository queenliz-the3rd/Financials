import { todayISO } from './format'

export type BudgetPeriod = 'monthly' | 'biweekly'
export type BiweeklyStyle = 'every14' | 'semimonthly'

export interface PeriodConfig {
  period: BudgetPeriod
  biweeklyStyle: BiweeklyStyle
  cycleStart: string // yyyy-mm-dd, anchor for the "every 14 days" style
}

export const DEFAULT_PERIOD: PeriodConfig = {
  period: 'monthly',
  biweeklyStyle: 'semimonthly',
  cycleStart: todayISO(),
}

export function periodsPerYear(cfg: PeriodConfig): number {
  if (cfg.period === 'monthly') return 12
  return cfg.biweeklyStyle === 'every14' ? 26 : 24
}

/* ----------------------------- amount conversion --------------------------- */
// Internally all limits/targets are stored as MONTHLY amounts (the canonical
// source of truth). These convert to/from the active period for display & edit,
// so switching period auto-converts everything with no data change.

export function toPeriodAmount(monthly: number, cfg: PeriodConfig): number {
  return (monthly * 12) / periodsPerYear(cfg)
}
export function fromPeriodAmount(periodAmount: number, cfg: PeriodConfig): number {
  return (periodAmount * periodsPerYear(cfg)) / 12
}

/* ------------------------------- date helpers ------------------------------ */

function localISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export interface PeriodRange {
  start: string // inclusive yyyy-mm-dd
  end: string // exclusive yyyy-mm-dd
}

// The period window that contains `now`.
export function currentPeriodRange(cfg: PeriodConfig, now: Date = new Date()): PeriodRange {
  const y = now.getFullYear()
  const m = now.getMonth()
  const day = now.getDate()

  if (cfg.period === 'monthly') {
    return { start: localISO(new Date(y, m, 1)), end: localISO(new Date(y, m + 1, 1)) }
  }

  if (cfg.biweeklyStyle === 'semimonthly') {
    return day <= 15
      ? { start: localISO(new Date(y, m, 1)), end: localISO(new Date(y, m, 16)) }
      : { start: localISO(new Date(y, m, 16)), end: localISO(new Date(y, m + 1, 1)) }
  }

  // every 14 days from the anchor
  const anchor = parseISO(cfg.cycleStart || todayISO())
  const msPerDay = 86_400_000
  const diffDays = Math.floor((now.getTime() - anchor.getTime()) / msPerDay)
  const cycleIndex = Math.floor(diffDays / 14)
  const start = new Date(anchor)
  start.setDate(anchor.getDate() + cycleIndex * 14)
  const end = new Date(start)
  end.setDate(start.getDate() + 14)
  return { start: localISO(start), end: localISO(end) }
}

// A stable key identifying the current period (used for per-period contribution tracking).
export function currentPeriodKey(cfg: PeriodConfig, now: Date = new Date()): string {
  return currentPeriodRange(cfg, now).start
}

/* --------------------------------- labels ---------------------------------- */

export function periodLabel(cfg: PeriodConfig, now: Date = new Date()): string {
  const { start, end } = currentPeriodRange(cfg, now)
  if (cfg.period === 'monthly') {
    return parseISO(start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }
  const startD = parseISO(start)
  const lastD = parseISO(end)
  lastD.setDate(lastD.getDate() - 1)
  const sameMonth = startD.getMonth() === lastD.getMonth()
  const fmtMonthDay = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric' })
  return sameMonth
    ? `${fmtMonthDay(startD)} – ${fmtDay(lastD)}`
    : `${fmtMonthDay(startD)} – ${fmtMonthDay(lastD)}`
}

// Short unit, e.g. "/mo", "/2wk", "/½mo"
export function periodShort(cfg: PeriodConfig): string {
  if (cfg.period === 'monthly') return 'mo'
  return cfg.biweeklyStyle === 'every14' ? '2wk' : '½mo'
}

// Long unit for sentences, e.g. "per month", "every 2 weeks", "twice a month"
export function periodLong(cfg: PeriodConfig): string {
  if (cfg.period === 'monthly') return 'per month'
  return cfg.biweeklyStyle === 'every14' ? 'every 2 weeks' : 'per half-month'
}

export function periodNoun(cfg: PeriodConfig): string {
  return cfg.period === 'monthly' ? 'month' : 'period'
}
