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
- **Savings goals** — set targets, add money (or withdraw), and watch the
  progress fill toward little celebrations 🎉.
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

Penny will automatically switch to cloud mode and show a passwordless
magic-link sign-in. No keys configured = it quietly stays in local mode.

## 🗂️ Project structure

```
src/
  components/   reusable UI (nav, modal, forms, cards, charts)
  context/      DataContext — state + derived monthly stats
  lib/          storage adapter (cloud/local), supabase client, types, helpers
  pages/        Dashboard · Transactions · Budgets · Goals
supabase/
  schema.sql    tables + row-level security
```

## 🔒 A note on privacy

In local mode your data never leaves your browser. In cloud mode it lives in
*your* Supabase project, protected by row-level security so only you can read
your rows.
