export type TxType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TxType
  amount: number
  category: string
  note: string
  date: string // ISO yyyy-mm-dd
  created_at?: string
}

export interface Budget {
  id: string
  category: string
  limit_amount: number
  created_at?: string
}

export interface Goal {
  id: string
  name: string
  target_amount: number
  saved_amount: number
  emoji: string
  deadline?: string | null // yyyy-mm-dd, or null for no deadline
  monthly_target?: number | null // desired contribution per month (canonical)
  auto_contribution?: boolean // if true, monthly_target is derived from the deadline
  contributed_this_month?: number // amount added during the current period
  contrib_month?: string // legacy yyyy-mm key (kept for back-compat)
  contrib_period?: string // period-start key the contribution total refers to
  created_at?: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'created_at'>
export type NewBudget = Omit<Budget, 'id' | 'created_at'>
export type NewGoal = Omit<Goal, 'id' | 'created_at'>

export interface Settings {
  email_enabled: boolean
  email_to: string
  timezone: string
  send_dow: number // 0 = Sunday .. 6 = Saturday
  send_hour: number // 0-23, local to timezone
  budget_period: 'monthly' | 'biweekly'
  biweekly_style: 'every14' | 'semimonthly'
  cycle_start: string // yyyy-mm-dd anchor for the "every 14 days" style
}

export const DEFAULT_SETTINGS: Settings = {
  email_enabled: false,
  email_to: '',
  timezone: 'America/Denver',
  send_dow: 0,
  send_hour: 18,
  budget_period: 'monthly',
  biweekly_style: 'semimonthly',
  cycle_start: new Date().toISOString().slice(0, 10),
}
