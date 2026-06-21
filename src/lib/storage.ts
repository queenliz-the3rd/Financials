import { supabase, isSupabaseConfigured } from './supabase'
import { uid } from './format'
import {
  DEFAULT_SETTINGS,
  type Transaction,
  type Budget,
  type Goal,
  type NewTransaction,
  type NewBudget,
  type NewGoal,
  type Settings,
} from './types'

// A small storage abstraction. Penny uses Supabase when it's configured,
// and falls back to the browser's localStorage so the app works instantly
// with zero setup.

export interface DataBundle {
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
}

export interface Store {
  cloud: boolean
  loadAll(): Promise<DataBundle>

  addTransaction(t: NewTransaction): Promise<Transaction>
  updateTransaction(id: string, patch: Partial<NewTransaction>): Promise<void>
  deleteTransaction(id: string): Promise<void>

  addBudget(b: NewBudget): Promise<Budget>
  updateBudget(id: string, patch: Partial<NewBudget>): Promise<void>
  deleteBudget(id: string): Promise<void>

  addGoal(g: NewGoal): Promise<Goal>
  updateGoal(id: string, patch: Partial<NewGoal>): Promise<void>
  deleteGoal(id: string): Promise<void>

  loadSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<void>
}

/* ------------------------------- Local store ------------------------------- */

const LS_KEY = 'penny.data.v1'
const LS_SETTINGS_KEY = 'penny.settings.v1'

function readLocal(): DataBundle {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as DataBundle
  } catch {
    /* ignore */
  }
  return seedData()
}

function writeLocal(data: DataBundle) {
  localStorage.setItem(LS_KEY, JSON.stringify(data))
}

class LocalStore implements Store {
  cloud = false

  async loadAll(): Promise<DataBundle> {
    return readLocal()
  }

  async addTransaction(t: NewTransaction): Promise<Transaction> {
    const data = readLocal()
    const row: Transaction = { ...t, id: uid(), created_at: new Date().toISOString() }
    data.transactions.unshift(row)
    writeLocal(data)
    return row
  }

  async updateTransaction(id: string, patch: Partial<NewTransaction>) {
    const data = readLocal()
    data.transactions = data.transactions.map((t) =>
      t.id === id ? { ...t, ...patch } : t,
    )
    writeLocal(data)
  }

  async deleteTransaction(id: string) {
    const data = readLocal()
    data.transactions = data.transactions.filter((t) => t.id !== id)
    writeLocal(data)
  }

  async addBudget(b: NewBudget): Promise<Budget> {
    const data = readLocal()
    const row: Budget = { ...b, id: uid(), created_at: new Date().toISOString() }
    data.budgets.push(row)
    writeLocal(data)
    return row
  }

  async updateBudget(id: string, patch: Partial<NewBudget>) {
    const data = readLocal()
    data.budgets = data.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b))
    writeLocal(data)
  }

  async deleteBudget(id: string) {
    const data = readLocal()
    data.budgets = data.budgets.filter((b) => b.id !== id)
    writeLocal(data)
  }

  async addGoal(g: NewGoal): Promise<Goal> {
    const data = readLocal()
    const row: Goal = { ...g, id: uid(), created_at: new Date().toISOString() }
    data.goals.push(row)
    writeLocal(data)
    return row
  }

  async updateGoal(id: string, patch: Partial<NewGoal>) {
    const data = readLocal()
    data.goals = data.goals.map((g) => (g.id === id ? { ...g, ...patch } : g))
    writeLocal(data)
  }

  async deleteGoal(id: string) {
    const data = readLocal()
    data.goals = data.goals.filter((g) => g.id !== id)
    writeLocal(data)
  }

  async loadSettings(): Promise<Settings> {
    try {
      const raw = localStorage.getItem(LS_SETTINGS_KEY)
      if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Settings) }
    } catch {
      /* ignore */
    }
    return DEFAULT_SETTINGS
  }

  async saveSettings(s: Settings): Promise<void> {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s))
  }
}

/* ------------------------------- Cloud store ------------------------------- */

class CloudStore implements Store {
  cloud = true

  private async userId(): Promise<string> {
    const { data } = await supabase!.auth.getUser()
    const id = data.user?.id
    if (!id) throw new Error('Not signed in')
    return id
  }

  async loadAll(): Promise<DataBundle> {
    const [tx, bg, gl] = await Promise.all([
      supabase!.from('transactions').select('*').order('date', { ascending: false }),
      supabase!.from('budgets').select('*').order('created_at', { ascending: true }),
      supabase!.from('goals').select('*').order('created_at', { ascending: true }),
    ])
    if (tx.error) throw tx.error
    if (bg.error) throw bg.error
    if (gl.error) throw gl.error
    return {
      transactions: (tx.data ?? []) as Transaction[],
      budgets: (bg.data ?? []) as Budget[],
      goals: (gl.data ?? []) as Goal[],
    }
  }

  async addTransaction(t: NewTransaction): Promise<Transaction> {
    const user_id = await this.userId()
    const { data, error } = await supabase!
      .from('transactions')
      .insert({ ...t, user_id })
      .select()
      .single()
    if (error) throw error
    return data as Transaction
  }

  async updateTransaction(id: string, patch: Partial<NewTransaction>) {
    const { error } = await supabase!.from('transactions').update(patch).eq('id', id)
    if (error) throw error
  }

  async deleteTransaction(id: string) {
    const { error } = await supabase!.from('transactions').delete().eq('id', id)
    if (error) throw error
  }

  async addBudget(b: NewBudget): Promise<Budget> {
    const user_id = await this.userId()
    const { data, error } = await supabase!
      .from('budgets')
      .insert({ ...b, user_id })
      .select()
      .single()
    if (error) throw error
    return data as Budget
  }

  async updateBudget(id: string, patch: Partial<NewBudget>) {
    const { error } = await supabase!.from('budgets').update(patch).eq('id', id)
    if (error) throw error
  }

  async deleteBudget(id: string) {
    const { error } = await supabase!.from('budgets').delete().eq('id', id)
    if (error) throw error
  }

  async addGoal(g: NewGoal): Promise<Goal> {
    const user_id = await this.userId()
    const { data, error } = await supabase!
      .from('goals')
      .insert({ ...g, user_id })
      .select()
      .single()
    if (error) throw error
    return data as Goal
  }

  async updateGoal(id: string, patch: Partial<NewGoal>) {
    const { error } = await supabase!.from('goals').update(patch).eq('id', id)
    if (error) throw error
  }

  async deleteGoal(id: string) {
    const { error } = await supabase!.from('goals').delete().eq('id', id)
    if (error) throw error
  }

  async loadSettings(): Promise<Settings> {
    const user_id = await this.userId()
    const { data, error } = await supabase!
      .from('settings')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle()
    if (error) throw error
    if (!data) return DEFAULT_SETTINGS
    return {
      email_enabled: data.email_enabled,
      email_to: data.email_to ?? '',
      timezone: data.timezone ?? DEFAULT_SETTINGS.timezone,
      send_dow: data.send_dow ?? DEFAULT_SETTINGS.send_dow,
      send_hour: data.send_hour ?? DEFAULT_SETTINGS.send_hour,
    }
  }

  async saveSettings(s: Settings): Promise<void> {
    const user_id = await this.userId()
    const { error } = await supabase!
      .from('settings')
      .upsert({ user_id, ...s }, { onConflict: 'user_id' })
    if (error) throw error
  }
}

export const store: Store = isSupabaseConfigured ? new CloudStore() : new LocalStore()

/* ----------------------------- Friendly seed ------------------------------ */

function seedData(): DataBundle {
  const today = new Date()
  const iso = (daysAgo: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    return d.toISOString().slice(0, 10)
  }
  const data: DataBundle = {
    transactions: [
      { id: uid(), type: 'income', amount: 3200, category: 'Salary', note: 'Monthly pay', date: iso(12) },
      { id: uid(), type: 'expense', amount: 1450, category: 'Rent', note: 'Apartment', date: iso(11) },
      { id: uid(), type: 'expense', amount: 86.4, category: 'Groceries', note: 'Weekly shop', date: iso(9) },
      { id: uid(), type: 'expense', amount: 24.5, category: 'Dining', note: 'Ramen with friends', date: iso(7) },
      { id: uid(), type: 'expense', amount: 42, category: 'Transport', note: 'Metro card', date: iso(6) },
      { id: uid(), type: 'expense', amount: 59.99, category: 'Shopping', note: 'New sweater', date: iso(4) },
      { id: uid(), type: 'expense', amount: 18, category: 'Fun', note: 'Movie night', date: iso(2) },
      { id: uid(), type: 'expense', amount: 63.2, category: 'Groceries', note: 'Market run', date: iso(1) },
    ],
    budgets: [
      { id: uid(), category: 'Groceries', limit_amount: 400 },
      { id: uid(), category: 'Dining', limit_amount: 150 },
      { id: uid(), category: 'Transport', limit_amount: 100 },
      { id: uid(), category: 'Fun', limit_amount: 120 },
    ],
    goals: [
      {
        id: uid(), name: 'Emergency fund', target_amount: 5000, saved_amount: 1800, emoji: '🛟',
        deadline: null, monthly_target: 300, contributed_this_month: 150, contrib_month: today.toISOString().slice(0, 7),
      },
      {
        id: uid(), name: 'Japan trip', target_amount: 3000, saved_amount: 950, emoji: '🗾',
        deadline: new Date(today.getFullYear() + 1, today.getMonth(), 1).toISOString().slice(0, 10),
        monthly_target: 200, contributed_this_month: 0, contrib_month: '',
      },
    ],
  }
  return data
}
