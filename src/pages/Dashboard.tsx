import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Plus } from 'lucide-react'
import StatCard from '../components/StatCard'
import Modal from '../components/Modal'
import ProgressBar from '../components/ProgressBar'
import EmptyState from '../components/EmptyState'
import TransactionForm from '../components/TransactionForm'
import { useData, useMonthStats } from '../context/DataContext'
import { categoryMeta } from '../lib/categories'
import { formatMoney, monthLabel, currentMonthKey, clamp, prettyDate } from '../lib/format'
import type { Page } from '../components/Nav'

export default function Dashboard({ go }: { go: (p: Page) => void }) {
  const { addTransaction, transactions, budgets } = useData()
  const stats = useMonthStats()
  const [adding, setAdding] = useState(false)

  const month = currentMonthKey()
  const recent = transactions.slice(0, 5)

  // Budget snapshot: top few budgets with spend
  const spentByCat = new Map(stats.spendingByCategory.map((s) => [s.category, s.amount]))
  const budgetSnapshot = budgets
    .map((b) => ({
      ...b,
      spent: spentByCat.get(b.category) ?? 0,
    }))
    .sort((a, b) => b.spent / b.limit_amount - a.spent / a.limit_amount)
    .slice(0, 3)

  const pieData = stats.spendingByCategory.slice(0, 6).map((s) => ({
    name: s.category,
    value: Math.round(s.amount * 100) / 100,
    color: categoryMeta(s.category).color,
  }))

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{monthLabel(month)}</p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Hello there 👋</h1>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Plus size={18} /> Add
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Income"
          value={formatMoney(stats.income)}
          tint="#bfe9d6"
          icon={<TrendingUp size={20} className="text-emerald-700" />}
          sub="this month"
        />
        <StatCard
          label="Spent"
          value={formatMoney(stats.expenses)}
          tint="#ffd6c9"
          icon={<TrendingDown size={20} className="text-rose-600" />}
          sub={`${stats.count} transactions`}
        />
        <StatCard
          label="Net"
          value={formatMoney(stats.net)}
          tint="#e7dcff"
          icon={<Wallet size={20} className="text-violet-700" />}
          sub={stats.net >= 0 ? 'saved this month 🎉' : 'over budget'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Spending breakdown */}
        <section className="card animate-fade-in p-5 lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Where it went</h2>
            <button
              className="text-xs font-semibold text-lavender hover:underline"
              onClick={() => go('transactions')}
            >
              View all
            </button>
          </div>

          {pieData.length === 0 ? (
            <EmptyState emoji="🫧" title="No spending yet" hint="Add a transaction to see your breakdown." />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {pieData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatMoney(v)}
                      contentStyle={{
                        borderRadius: 16,
                        border: 'none',
                        boxShadow: '0 8px 30px -12px rgba(120,100,160,.4)',
                        fontSize: 13,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted">total</span>
                  <span className="text-lg font-extrabold">{formatMoney(stats.expenses, true)}</span>
                </div>
              </div>
              <ul className="flex-1 space-y-2 self-stretch">
                {pieData.map((d) => (
                  <li key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                    <span className="font-medium">{categoryMeta(d.name).emoji} {d.name}</span>
                    <span className="ml-auto font-semibold text-muted">{formatMoney(d.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section className="card animate-fade-in p-5 lg:col-span-2">
          <h2 className="mb-3 font-bold">Recent activity</h2>
          {recent.length === 0 ? (
            <EmptyState emoji="🧾" title="Nothing here yet" />
          ) : (
            <ul className="space-y-1">
              {recent.map((t) => {
                const m = categoryMeta(t.category)
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-lilac/20">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
                      style={{ background: m.color }}
                    >
                      {m.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.note || t.category}</p>
                      <p className="text-xs text-muted">{prettyDate(t.date)}</p>
                    </div>
                    <span
                      className={`ml-auto text-sm font-bold ${
                        t.type === 'income' ? 'text-emerald-600' : 'text-ink'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '–'}
                      {formatMoney(t.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Budget snapshot */}
      {budgetSnapshot.length > 0 && (
        <section className="card animate-fade-in p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Budget watch</h2>
            <button
              className="text-xs font-semibold text-lavender hover:underline"
              onClick={() => go('budgets')}
            >
              Manage
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {budgetSnapshot.map((b) => {
              const ratio = b.spent / b.limit_amount
              const over = ratio > 1
              const m = categoryMeta(b.category)
              return (
                <div key={b.id} className="rounded-2xl border border-lilac/40 bg-white/50 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold">{m.emoji} {b.category}</span>
                    <span className={over ? 'font-bold text-rose-500' : 'text-muted'}>
                      {Math.round(clamp(ratio, 0, 99) * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={ratio} color={m.color} over={over} />
                  <p className="mt-2 text-xs text-muted">
                    {formatMoney(b.spent)} of {formatMoney(b.limit_amount)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <Modal open={adding} title="Add transaction" onClose={() => setAdding(false)}>
        <TransactionForm
          onCancel={() => setAdding(false)}
          onSubmit={async (t) => {
            await addTransaction(t)
            setAdding(false)
          }}
        />
      </Modal>
    </div>
  )
}
