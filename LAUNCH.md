# 🚀 Launch Penny for real (accounts + emails)

This makes your **public URL** (https://queenliz-the3rd.github.io/Financials/)
a real, logged-in app with weekly emails to **you**. ~15 minutes, one time.

You'll set up two free services: **Supabase** (accounts + database) and
**Resend** (email). Then add a few keys to GitHub.

---

## Part 1 — Supabase (accounts + your data) · ~5 min

1. Go to **https://supabase.com** → sign up → **New project**. Pick any name
   and a strong database password (you won't need it again). Wait ~2 min for it
   to finish setting up.
2. In the left sidebar open **SQL Editor** → **New query**. Open the file
   [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy **all** of
   it, paste it in, and click **Run**. You should see "Success". (This creates
   your tables, the PIN functions, and security rules.)
3. Turn off email confirmation so username/password sign-up works instantly:
   **Authentication → Sign In / Providers → Email** → turn **OFF**
   "Confirm email" → **Save**.
4. Grab your keys: **Project Settings → API**. Copy:
   - **Project URL**  (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string)

Keep these two handy for Part 3.

---

## Part 2 — Resend (the weekly email) · ~5 min

1. Go to **https://resend.com** and **sign up using `elizabethcousins2@gmail.com`**.
   ⚠️ This matters: with Resend's free built-in sender you can only email the
   address you signed up with — which is exactly the one you want the insights
   sent to. (To email other people later, you'd verify a domain.)
2. **API Keys → Create API Key** → name it "Penny" → copy the key
   (starts with `re_…`). You won't see it again, so paste it somewhere safe.

---

## Part 3 — Connect it to your live site · ~3 min

GitHub stores these secrets and rebuilds the site to use them.

1. Go to your repo's **Settings → Secrets and variables → Actions →
   New repository secret**. Add **two** secrets:
   - Name `VITE_SUPABASE_URL` → value = your Supabase **Project URL**
   - Name `VITE_SUPABASE_ANON_KEY` → value = your Supabase **anon public** key
2. Trigger a rebuild: **Actions** tab → "Deploy Penny to GitHub Pages" →
   **Run workflow** (or just push any change). When it finishes (~1 min), your
   live site will show a **username/password sign-up** instead of demo mode. 🎉

> The anon key is meant to be public in the browser — your data is protected by
> the row-level security rules from Part 1.

---

## Part 4 — Deploy the email sender · ~3 min

This needs the **Supabase CLI** on your computer. In a terminal:

```bash
# install once (Mac: brew install supabase/tap/supabase — or see supabase.com/docs/guides/cli)
supabase login
supabase link --project-ref <your-project-ref>     # the abcd1234 from your URL

# give the email function its keys
supabase secrets set RESEND_API_KEY=re_xxxxxxxx "EMAIL_FROM=Penny <onboarding@resend.dev>"

# deploy the function that builds + sends the insight
supabase functions deploy weekly-insight
```

Then schedule the weekly send: back in the Supabase **SQL Editor**, open
[`supabase/cron.sql`](supabase/cron.sql), replace `<PROJECT_REF>` and
`<SERVICE_ROLE_KEY>` (Settings → API → **service_role** key) with your values,
and **Run** it. It checks hourly and emails each person at their chosen day/time.

---

## Part 5 — Turn it on & test

1. Open your live site, **sign up** (username + password), set your **PIN**.
2. Go to **Settings**:
   - Enter your email (`elizabethcousins2@gmail.com`) in **Send to**.
   - Click **Send me a test now** → check your inbox (and spam) for the insight. 📬
   - Flip **Weekly insight email** on, pick the day/time (Sunday 6 PM Mountain
     is the default), and **Save preferences**.

That's it — you're live, with real accounts and a real weekly email. 🪻

### Troubleshooting
- **Test email didn't arrive:** check spam; confirm you signed up to Resend with
  the *same* address you're sending to; confirm `RESEND_API_KEY` is set
  (`supabase secrets list`).
- **Live site still shows demo mode:** the two GitHub secrets weren't picked up —
  re-run the deploy workflow after adding them.
- **Can't sign up ("confirm email"):** finish Part 1, step 3.
