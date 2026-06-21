import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { store } from '../lib/storage'
import { currentMonthKey, monthKey } from '../lib/format'
import type {
  Budget,
  Goal,
  NewBudget,
  NewGoal,
  NewTransaction,
  Transaction,
} from '../lib/types'

interface DataState {
  loading: boolean
  cloud: boolean
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]

  addTransaction: (t: NewTransaction) => Promise<void>
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>

  addBudget: (b: NewBudget) => Promise<void>
  updateBudget: (id: string, patch: Partial<NewBudget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>

  addGoal: (g: NewGoal) => Promise<void>
  updateGoal: (id: string, patch: Partial<NewGoal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>

  refresh: () => Promise<void>
}

const Ctx = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])

  const refresh = useCallback(async () => {
    const data = await store.loadAll()
    setTransactions(data.transactions)
    setBudgets(data.budgets)
    setGoals(data.goals)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        await refresh()
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [refresh])

  const value = useMemo<DataState>(
    () => ({
      loading,
      cloud: store.cloud,
      transactions,
      budgets,
      goals,

      async addTransaction(t) {
        const row = await store.addTransaction(t)
        setTransactions((prev) =>
          [row, ...prev].sort((a, b) => b.date.localeCompare(a.date)),
        )
      },
      async updateTransaction(id, patch) {
        await store.updateTransaction(id, patch)
        setTransactions((prev) =>
          prev
            .map((t) => (t.id === id ? { ...t, ...patch } : t))
            .sort((a, b) => b.date.localeCompare(a.date)),
        )
      },
      async deleteTransaction(id) {
        await store.deleteTransaction(id)
        setTransactions((prev) => prev.filter((t) => t.id !== id))
      },

      async addBudget(b) {
        const row = await store.addBudget(b)
        setBudgets((prev) => [...prev, row])
      },
      async updateBudget(id, patch) {
        await store.updateBudget(id, patch)
        setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
      },
      async deleteBudget(id) {
        await store.deleteBudget(id)
        setBudgets((prev) => prev.filter((b) => b.id !== id))
      },

      async addGoal(g) {
        const row = await store.addGoal(g)
        setGoals((prev) => [...prev, row])
      },
      async updateGoal(id, patch) {
        await store.updateGoal(id, patch)
        setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
      },
      async deleteGoal(id) {
        await store.deleteGoal(id)
        setGoals((prev) => prev.filter((g) => g.id !== id))
      },

      refresh,
    }),
    [loading, transactions, budgets, goals, refresh],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): DataState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

/* ------------------------------- Selectors -------------------------------- */

export function useMonthStats(month: string = currentMonthKey()) {
  const { transactions } = useData()
  return useMemo(() => {
    const inMonth = transactions.filter((t) => monthKey(t.date) === month)
    const income = inMonth
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const expenses = inMonth
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)

    const byCategory = new Map<string, number>()
    for (const t of inMonth) {
      if (t.type !== 'expense') continue
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount)
    }
    const spendingByCategory = [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)

    return {
      income,
      expenses,
      net: income - expenses,
      count: inMonth.length,
      spendingByCategory,
      transactions: inMonth,
    }
  }, [transactions, month])
}
