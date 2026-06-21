import { formatMoney } from './format'
import { categoryMeta } from './categories'
import type { Transaction, Budget, Goal } from './types'

export interface Insight {
  subject: string
  text: string
  html: string
}

function shiftISO(now: Date, days: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

const TIPS = [
  'Small, steady saves beat big rare ones. 🌱',
  'Try a no-spend day this week — your future self says thanks.',
  'Review one subscription you forgot about. 🔍',
  'Round up a purchase and send the change to a goal.',
  'A calm budget is a kept budget. You’ve got this. 💜',
]

/**
 * Builds the weekly finance insight. Pure + dependency-light so the same logic
 * can run in the browser (preview) and (mirrored) in the Supabase edge function.
 */
export function buildInsight(
  transactions: Transaction[],
  budgets: Budget[],
  goals: Goal[],
  now: Date = new Date(),
): Insight {
  const tomorrow = shiftISO(now, -1) // exclusive upper bound (includes today)
  const wk1Start = shiftISO(now, 7)
  const wk2Start = shiftISO(now, 14)
  const month = now.toISOString().slice(0, 7)

  const expenses = transactions.filter((t) => t.type === 'expense')
  const inRange = (d: string, start: string, end: string) => d >= start && d < end
  const sum = (arr: Transaction[]) => arr.reduce((s, t) => s + t.amount, 0)

  const thisWeek = expenses.filter((t) => inRange(t.date, wk1Start, tomorrow))
  const lastWeek = expenses.filter((t) => inRange(t.date, wk2Start, wk1Start))
  const thisTotal = sum(thisWeek)
  const lastTotal = sum(lastWeek)

  const lines: string[] = []

  // 1) Spending vs last week
  if (thisWeek.length === 0) {
    lines.push(`No spending logged in the last 7 days — quiet week! 🫧`)
  } else if (lastTotal > 0) {
    const diff = thisTotal - lastTotal
    const pct = Math.round((Math.abs(diff) / lastTotal) * 100)
    if (diff < 0) {
      lines.push(`You spent ${formatMoney(thisTotal)} this week — ${pct}% less than last week. 🎉`)
    } else if (diff > 0) {
      lines.push(`You spent ${formatMoney(thisTotal)} this week — ${pct}% more than last week.`)
    } else {
      lines.push(`You spent ${formatMoney(thisTotal)} this week — same as last week.`)
    }
  } else {
    lines.push(`You spent ${formatMoney(thisTotal)} this week.`)
  }

  // 2) Top category this week
  if (thisWeek.length > 0) {
    const byCat = new Map<string, number>()
    for (const t of thisWeek) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount)
    const [cat, amt] = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
    lines.push(`Biggest category: ${categoryMeta(cat).emoji} ${cat} (${formatMoney(amt)}).`)
  }

  // 3) Budget alerts (current month)
  const monthExpenses = expenses.filter((t) => t.date.slice(0, 7) === month)
  const spentByCat = new Map<string, number>()
  for (const t of monthExpenses) spentByCat.set(t.category, (spentByCat.get(t.category) ?? 0) + t.amount)

  const alerts: string[] = []
  for (const b of budgets) {
    const spent = spentByCat.get(b.category) ?? 0
    const ratio = b.limit_amount > 0 ? spent / b.limit_amount : 0
    if (ratio > 1) {
      alerts.push(`⚠️ Over budget on ${b.category}: ${formatMoney(spent)} of ${formatMoney(b.limit_amount)}.`)
    } else if (ratio >= 0.8) {
      alerts.push(`Heads up — ${b.category} is at ${Math.round(ratio * 100)}% of budget.`)
    }
  }
  if (budgets.length > 0) {
    if (alerts.length > 0) lines.push(...alerts)
    else lines.push(`All budgets are comfortably on track this month. 🌿`)
  }

  // 4) Savings progress + a tip
  const active = goals
    .map((g) => ({ ...g, ratio: g.target_amount > 0 ? g.saved_amount / g.target_amount : 0 }))
    .filter((g) => g.ratio < 1)
    .sort((a, b) => b.ratio - a.ratio)
  const goal = active[0] ?? goals[0]
  if (goal) {
    const pct = Math.round((goal.saved_amount / goal.target_amount) * 100)
    const left = Math.max(0, goal.target_amount - goal.saved_amount)
    lines.push(`${goal.emoji} ${goal.name}: ${pct}% there, ${formatMoney(left)} to go.`)
  }

  // Tip — if they spent less than last week, nudge the difference into a goal
  let tip: string
  if (thisTotal < lastTotal && goal) {
    tip = `Tip: you spent ${formatMoney(lastTotal - thisTotal)} less than last week — tuck it into ${goal.name}. 🌱`
  } else {
    const week = Math.floor(now.getTime() / (7 * 864e5))
    tip = `Tip: ${TIPS[week % TIPS.length]}`
  }
  lines.push(tip)

  const subject = `🪻 Your Penny weekly insight`
  const text = `Hi! Here's your week with money:\n\n` + lines.map((l) => `• ${l}`).join('\n') + `\n\n— Penny`

  const html = renderHtml(lines)
  return { subject, text, html }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderHtml(lines: string[]): string {
  const items = lines
    .map(
      (l) =>
        `<li style="margin:0 0 12px;padding:14px 16px;background:#ffffff;border:1px solid #efe9f7;border-radius:16px;color:#2f2a3a;font-size:15px;line-height:1.5;list-style:none;">${escapeHtml(
          l,
        )}</li>`,
    )
    .join('')
  return `<!doctype html><html><body style="margin:0;background:#faf7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:18px;">
      <div style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:14px;background:#cdb4f6;color:#fff;font-weight:800;font-size:20px;">P</div>
      <h1 style="margin:10px 0 2px;font-size:20px;color:#2f2a3a;">Your weekly insight</h1>
      <p style="margin:0;color:#8b8597;font-size:13px;">Penny · money, made calm</p>
    </div>
    <ul style="margin:0;padding:0;">${items}</ul>
    <p style="text-align:center;color:#b3adbf;font-size:12px;margin-top:18px;">You're receiving this because weekly insights are on in Penny.</p>
  </div>
</body></html>`
}
