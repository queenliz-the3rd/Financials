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
  created_at?: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'created_at'>
export type NewBudget = Omit<Budget, 'id' | 'created_at'>
export type NewGoal = Omit<Goal, 'id' | 'created_at'>
