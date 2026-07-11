# Tally — split trip costs

A shared ledger for a trip: log cost items, split each one by whatever unit
makes sense (nights stayed, pretax meal cost, etc.), and settle up at the end
using the fewest possible payments.

Free stack: **Supabase** (database) + **Vercel** (hosting), both on free tiers.
This README walks through the one-time setup. Total time: ~20 minutes.

## 1. Create a Supabase project (free)

1. Go to supabase.com and sign up / log in, then "New project."
2. Pick any name/region, set a database password (you won't need it again — the
   app uses a separate API key).
3. Once it's created, go to **SQL Editor → New query**, paste in the contents
   of `supabase/schema.sql` from this project, and run it. This creates the
   `trips`, `people`, `cost_items`, and `cost_shares` tables.
4. Go to **Project Settings → API**. You'll need two values from here in a
   minute:
   - **Project URL**
   - **service_role key** (NOT the `anon` key — the service role key is secret
     and must never be exposed to the browser; that's why it's only used in
     this app's server-side API routes, never in client code)

## 2. Push this project to GitHub

Vercel deploys from a GitHub repo. Create a new (private is fine) repo and
push this folder to it:

```bash
cd tripsplit
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tally-tripsplit.git
git push -u origin main
```

## 3. Deploy to Vercel (free)

1. Go to vercel.com, sign up / log in with GitHub, click "Add New → Project,"
   and import the repo you just pushed.
2. Before deploying, add four **Environment Variables** (Settings →
   Environment Variables, or in the import screen):
   - `SUPABASE_URL` — the Project URL from step 1
   - `SUPABASE_SERVICE_ROLE_KEY` — the service role key from step 1
   - `SESSION_SECRET` — any long random string. Generate one locally with
     `openssl rand -hex 32`, or just mash the keyboard for 40+ characters.
   - `MASTER_PASSWORD` — the password that gates *creating and deleting*
     trips (separate from each trip's own password, which friends use to
     view/edit that trip).
3. Click Deploy. Vercel gives you a URL like `tally-tripsplit.vercel.app` —
   that's the link you share with friends.

That's the whole setup. From here on, every `git push` to `main`
auto-redeploys.

## Using it

- Open the site, click "New trip," give it a name and a password, share both
  (or just the link + password) with your trip group.
- Anyone with the password can open the trip on their phone and add
  items — no accounts needed. This is a lightweight gate meant to keep out
  randos/spam, not a real security boundary; don't put sensitive financial
  info in trip names.
- Each cost item: description, who paid, total $, then a **portion** per
  person involved (nights stayed, meal cost, whatever unit fits). The $ column
  fills in automatically as portion ÷ total portions × item total.
- The **Settle up** section at the bottom computes the minimum-transaction
  payoff plan automatically, updating live as you add/edit items.
- To start a new trip later, just go back to the home page — up to ~20 trips
  is well within Supabase's free tier (500MB database, more than enough for
  this).

## Local development (optional)

```bash
npm install
cp .env.example .env.local   # fill in your real values
npm run dev
```

Then open http://localhost:3000.

## Notes on the settlement algorithm

Finding the *absolute* minimum number of transactions to settle a group of
balances is NP-hard in general (it's related to subset-sum). This app uses the
standard practical approach instead: repeatedly match the person owed the
most against the person who owes the most, and settle between them. In
practice this gets very close to optimal and — matching what you asked for —
tends to naturally concentrate leftover odd amounts onto a small number of
"hub" people rather than spreading many small payments across everyone.
