// Supabase Edge Function: weekly-insight
//
// Two modes:
//  • Scheduled (called hourly by pg_cron with the service-role key): sends to
//    every user whose local day/hour matches their preference and who hasn't
//    already received one this week.
//  • Test ({ "test": true } from the app, with the user's JWT): sends one email
//    to the calling user right now.
//
// Required function secrets (supabase secrets set ...):
//   RESEND_API_KEY   - from https://resend.com
//   EMAIL_FROM       - e.g. "Penny <penny@yourdomain.com>" (or onboarding@resend.dev to start)
// Provided automatically by Supabase:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Transaction {
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
}
interface Budget {
  category: string
  limit_amount: number
}
interface Goal {
  name: string
  target_amount: number
  saved_amount: number
  emoji: string
}
interface Settings {
  user_id: string
  email_enabled: boolean
  email_to: string
  timezone: string
  send_dow: number
  send_hour: number
  last_sent_at: string | null
}

const CATEGORY_EMOJI: Record<string, string> = {
  Groceries: '🛒', Dining: '🍜', Rent: '🏠', Transport: '🚌', Shopping: '🛍️',
  Health: '💊', Fun: '🎉', Bills: '🧾', Travel: '✈️', Other: '✨',
  Salary: '💼', Freelance: '💻', Gift: '🎁', Refund: '↩️',
}
const emojiFor = (c: string) => CATEGORY_EMOJI[c] ?? '✨'

const TIPS = [
  'Small, steady saves beat big rare ones. 🌱',
  'Try a no-spend day this week — your future self says thanks.',
  'Review one subscription you forgot about. 🔍',
  'Round up a purchase and send the change to a goal.',
  'A calm budget is a kept budget. You’ve got this. 💜',
]

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

function shiftISO(now: Date, days: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function buildInsight(transactions: Transaction[], budgets: Budget[], goals: Goal[], now: Date) {
  const tomorrow = shiftISO(now, -1)
  const wk1Start = shiftISO(now, 7)
  const wk2Start = shiftISO(now, 14)
  const month = now.toISOString().slice(0, 7)

  const expenses = transactions.filter((t) => t.type === 'expense')
  const inRange = (d: string, s: string, e: string) => d >= s && d < e
  const sum = (a: Transaction[]) => a.reduce((s, t) => s + Number(t.amount), 0)

  const thisWeek = expenses.filter((t) => inRange(t.date, wk1Start, tomorrow))
  const lastWeek = expenses.filter((t) => inRange(t.date, wk2Start, wk1Start))
  const thisTotal = sum(thisWeek)
  const lastTotal = sum(lastWeek)

  const lines: string[] = []

  if (thisWeek.length === 0) {
    lines.push('No spending logged in the last 7 days — quiet week! 🫧')
  } else if (lastTotal > 0) {
    const diff = thisTotal - lastTotal
    const pct = Math.round((Math.abs(diff) / lastTotal) * 100)
    if (diff < 0) lines.push(`You spent ${money(thisTotal)} this week — ${pct}% less than last week. 🎉`)
    else if (diff > 0) lines.push(`You spent ${money(thisTotal)} this week — ${pct}% more than last week.`)
    else lines.push(`You spent ${money(thisTotal)} this week — same as last week.`)
  } else {
    lines.push(`You spent ${money(thisTotal)} this week.`)
  }

  if (thisWeek.length > 0) {
    const byCat = new Map<string, number>()
    for (const t of thisWeek) byCat.set(t.category, (byCat.get(t.category) ?? 0) + Number(t.amount))
    const [cat, amt] = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
    lines.push(`Biggest category: ${emojiFor(cat)} ${cat} (${money(amt)}).`)
  }

  const monthExpenses = expenses.filter((t) => t.date.slice(0, 7) === month)
  const spentByCat = new Map<string, number>()
  for (const t of monthExpenses) spentByCat.set(t.category, (spentByCat.get(t.category) ?? 0) + Number(t.amount))
  const alerts: string[] = []
  for (const b of budgets) {
    const spent = spentByCat.get(b.category) ?? 0
    const ratio = Number(b.limit_amount) > 0 ? spent / Number(b.limit_amount) : 0
    if (ratio > 1) alerts.push(`⚠️ Over budget on ${b.category}: ${money(spent)} of ${money(Number(b.limit_amount))}.`)
    else if (ratio >= 0.8) alerts.push(`Heads up — ${b.category} is at ${Math.round(ratio * 100)}% of budget.`)
  }
  if (budgets.length > 0) {
    if (alerts.length > 0) lines.push(...alerts)
    else lines.push('All budgets are comfortably on track this month. 🌿')
  }

  const active = goals
    .map((g) => ({ ...g, ratio: Number(g.target_amount) > 0 ? Number(g.saved_amount) / Number(g.target_amount) : 0 }))
    .filter((g) => g.ratio < 1)
    .sort((a, b) => b.ratio - a.ratio)
  const goal = active[0] ?? goals[0]
  if (goal) {
    const pct = Math.round((Number(goal.saved_amount) / Number(goal.target_amount)) * 100)
    const left = Math.max(0, Number(goal.target_amount) - Number(goal.saved_amount))
    lines.push(`${goal.emoji} ${goal.name}: ${pct}% there, ${money(left)} to go.`)
  }

  if (thisTotal < lastTotal && goal) {
    lines.push(`Tip: you spent ${money(lastTotal - thisTotal)} less than last week — tuck it into ${goal.name}. 🌱`)
  } else {
    const week = Math.floor(now.getTime() / (7 * 864e5))
    lines.push(`Tip: ${TIPS[week % TIPS.length]}`)
  }

  const subject = '🪻 Your Penny weekly insight'
  const text = `Hi! Here's your week with money:\n\n` + lines.map((l) => `• ${l}`).join('\n') + `\n\n— Penny`
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const items = lines
    .map((l) => `<li style="margin:0 0 12px;padding:14px 16px;background:#fff;border:1px solid #efe9f7;border-radius:16px;color:#2f2a3a;font-size:15px;line-height:1.5;list-style:none;">${esc(l)}</li>`)
    .join('')
  const html = `<!doctype html><html><body style="margin:0;background:#faf7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;"><div style="max-width:520px;margin:0 auto;"><div style="text-align:center;margin-bottom:18px;"><div style="display:inline-block;width:44px;height:44px;line-height:44px;border-radius:14px;background:#cdb4f6;color:#fff;font-weight:800;font-size:20px;">P</div><h1 style="margin:10px 0 2px;font-size:20px;color:#2f2a3a;">Your weekly insight</h1><p style="margin:0;color:#8b8597;font-size:13px;">Penny · money, made calm</p></div><ul style="margin:0;padding:0;">${items}</ul><p style="text-align:center;color:#b3adbf;font-size:12px;margin-top:18px;">You're receiving this because weekly insights are on in Penny.</p></div></body></html>`
  return { subject, text, html }
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM') ?? 'Penny <onboarding@resend.dev>'
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text }),
  })
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`)
}

async function loadUserData(admin: ReturnType<typeof createClient>, userId: string) {
  const [tx, bg, gl] = await Promise.all([
    admin.from('transactions').select('type,amount,category,date').eq('user_id', userId),
    admin.from('budgets').select('category,limit_amount').eq('user_id', userId),
    admin.from('goals').select('name,target_amount,saved_amount,emoji').eq('user_id', userId),
  ])
  return {
    transactions: (tx.data ?? []) as Transaction[],
    budgets: (bg.data ?? []) as Budget[],
    goals: (gl.data ?? []) as Goal[],
  }
}

// Returns the day-of-week (0=Sun) and hour for `now` in the given timezone.
function localDowHour(now: Date, tz: string): { dow: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour: '2-digit', hour12: false,
  }).formatToParts(now)
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0'
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { dow: map[wd] ?? 0, hour: Number(hourStr) % 24 }
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const admin = createClient(url, serviceKey)

  let body: { test?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    /* no body = scheduled run */
  }

  try {
    // ---- Test mode: send to the authenticated caller only ----
    if (body.test) {
      const authHeader = req.headers.get('Authorization') ?? ''
      const userClient = createClient(url, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData, error: userErr } = await userClient.auth.getUser()
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), {
          status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
      const uid = userData.user.id
      const { data: s } = await admin.from('settings').select('*').eq('user_id', uid).maybeSingle()
      const to = (s as Settings | null)?.email_to || userData.user.email
      if (!to) throw new Error('No email address on file')
      const { transactions, budgets, goals } = await loadUserData(admin, uid)
      const insight = buildInsight(transactions, budgets, goals, new Date())
      await sendEmail(to, insight.subject, insight.html, insight.text)
      return new Response(JSON.stringify({ ok: true, sent_to: to }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // ---- Scheduled mode: send to everyone who's due right now ----
    const now = new Date()
    const { data: rows, error } = await admin
      .from('settings')
      .select('*')
      .eq('email_enabled', true)
    if (error) throw error

    let sent = 0
    for (const s of (rows ?? []) as Settings[]) {
      if (!s.email_to) continue
      const { dow, hour } = localDowHour(now, s.timezone)
      if (dow !== s.send_dow || hour !== s.send_hour) continue
      // De-dupe: skip if we already sent within the last 3 days
      if (s.last_sent_at && now.getTime() - new Date(s.last_sent_at).getTime() < 3 * 864e5) continue

      const { transactions, budgets, goals } = await loadUserData(admin, s.user_id)
      const insight = buildInsight(transactions, budgets, goals, now)
      try {
        await sendEmail(s.email_to, insight.subject, insight.html, insight.text)
        await admin.from('settings').update({ last_sent_at: now.toISOString() }).eq('user_id', s.user_id)
        sent++
      } catch (e) {
        console.error(`Failed for ${s.user_id}:`, e)
      }
    }
    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
