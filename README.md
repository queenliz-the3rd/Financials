# 🪻 Penny — money, made calm

A clean, pastel personal-finance web app for tracking spending, budgets, and
savings goals. Built with React, TypeScript, Vite, Tailwind, and Recharts.

> Works **instantly** with local storage (zero setup). Add a Supabase project
> when you're ready to **sync across devices**.

## ✨ Features

- **Overview dashboard** — income / spent / net at a glance, a donut chart of
  where your money went, recent activity, and a live budget watch.
- **Activity** — add, edit, search, and filter income & expenses, grouped by day.
- **Budgets** — set a gentle monthly limit per category with calm progress bars
  (and a friendly nudge when you go over).
- **Income planner** — built for irregular income (part-time, tips): plan any
  amount (a single paycheck or a whole month) against your budgets and goals and
  see exactly what's covered, what's free, or what's short. Uses your real
  logged income (this month + a rolling 3-month average).
- **Savings goals** — set targets, add money (or withdraw), watch progress fill
  toward little celebrations 🎉. Each goal can have an **optional deadline**
  (with the required monthly amount + on/off-track status) and a **monthly
  contribution goal** tracked month to month.
- **Weekly insight email** — an optional friendly recap delivered to your inbox
  once a week (spending vs. last week, top category, budget alerts, savings +
  a tip). Preview it live in **Settings**.
- **Accounts + PIN lock** — username/password sign-in with a "stay logged in"
  option, plus a Venmo-style **4-digit PIN required every time the app opens**
  (bcrypt-hashed, verified server-side, locks out after 5 wrong tries).
- **Responsive** — sidebar on desktop, bottom tab bar on mobile.
- **Pastel + minimal** — soft cards, rounded corners, calming colors.

## 🚀 Run it

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173). That's it — it comes
pre-loaded with friendly sample data you can clear by editing your entries.

Build for production:

```bash
npm run build && npm run preview
```

## ☁️ Optional: cloud sync with Supabase

Local storage keeps everything on one device. To sync across your phone and
laptop with secure per-user accounts:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql).
   This creates the tables and Row Level Security so each account only sees its
   own data.
3. Copy `.env.example` to `.env` and fill in your project URL and anon key
   (Project Settings → API).
4. Restart `npm run dev`.

Penny will automatically switch to cloud mode. No keys configured = it quietly
stays in local mode.

### Accounts & the PIN lock

- People sign up with a **username + password** (the username is mapped to an
  internal email behind the scenes, so no email is required to sign up).
- **Important:** in your Supabase dashboard go to **Authentication → Providers →
  Email** and turn **off** "Confirm email" — otherwise new username/password
  sign-ups can't log in immediately.
- On first login each person sets a **4-digit PIN**. It's stored only as a
  bcrypt hash (`pgcrypto`) and checked by the `verify_pin` SQL function, which
  locks the account after 5 wrong attempts. The PIN is asked for every time the
  app opens. "Forgot PIN?" signs out; logging back in lets them set a new one.
- In local/demo mode the same flow works with accounts and PIN hashes stored in
  the browser, so you can try it on the live site without any backend.

## 📬 Optional: weekly insight email

Once cloud sync is on, you can get an automatic weekly recap by email. This
needs a (free) email sender and a scheduled job — both set up once:

1. **Get a Resend API key** — sign up at [resend.com](https://resend.com) and
   create an API key. To start, you can send from `onboarding@resend.dev`; to
   send from your own address, verify a domain in Resend.

2. **Deploy the edge function** (with the [Supabase CLI](https://supabase.com/docs/guides/cli)):

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase secrets set RESEND_API_KEY=re_xxx "EMAIL_FROM=Penny <onboarding@resend.dev>"
   supabase functions deploy weekly-insight
   ```

3. **Schedule it** — open `supabase/cron.sql`, fill in your project ref and
   service-role key, and run it in the Supabase SQL Editor. It calls the
   function hourly; the function decides who is "due" based on each person's
   timezone, day, and hour, so one schedule covers all timezones.

4. **Turn it on in the app** — go to **Settings → Weekly insight email**,
   toggle it on, confirm your address/day/time, **Save**, and hit
   **Send me a test now** to confirm it works. 🎉

Don't want email? Just leave the toggle off — nothing sends.

## 🗂️ Project structure

```
src/
  components/   reusable UI (nav, modal, forms, cards, charts)
  context/      DataContext — state + derived monthly stats
  lib/          storage adapter (cloud/local), supabase client, insight engine, helpers
  pages/        Dashboard · Transactions · Budgets · Goals · Settings
supabase/
  schema.sql              tables + row-level security
  cron.sql                hourly schedule for the weekly email
  functions/
    weekly-insight/       edge function: builds the insight + sends via Resend
```

## 🔒 A note on privacy

In local mode your data never leaves your browser. In cloud mode it lives in
*your* Supabase project, protected by row-level security so only you can read
your rows.
