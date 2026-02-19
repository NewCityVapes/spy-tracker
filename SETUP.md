# SPY Tracker — Setup Guide

Complete step-by-step instructions to get your trading tracker live on Vercel with Supabase as the database.

---

## Overview

- **Frontend**: Next.js (React) hosted on Vercel
- **Database**: Supabase (Postgres)
- **Total cost**: $0 (both have free tiers)
- **Time to deploy**: ~15 minutes

---

## STEP 1 — Set Up Supabase

### 1.1 Create a new project

1. Go to [supabase.com](https://supabase.com) and log in
2. Click **"New Project"**
3. Give it a name: `spy-tracker`
4. Set a strong database password (save it somewhere)
5. Choose the region closest to you
6. Click **"Create new project"** — wait ~2 minutes for it to spin up

### 1.2 Run the database schema

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from this project
4. Copy the entire contents and paste it into the SQL editor
5. Click **"Run"** (or press Cmd+Enter)
6. You should see "Success. No rows returned" — that's correct

### 1.3 Get your API keys

1. In the left sidebar, click **"Project Settings"** (gear icon)
2. Click **"API"**
3. You need two values — copy them somewhere:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — long string starting with `eyJ...`

---

## STEP 2 — Set Up the GitHub Repo

### 2.1 Create the repo

1. Go to [github.com](https://github.com) and log in
2. Click **"New repository"**
3. Name it: `spy-tracker`
4. Set to **Private** (recommended — this is your personal trading data)
5. Do NOT initialize with README (we have our own files)
6. Click **"Create repository"**

### 2.2 Upload the project files

You have two options:

**Option A — GitHub Desktop (easiest)**
1. Download [GitHub Desktop](https://desktop.github.com)
2. Clone your new empty repo to your computer
3. Copy all the project files into the cloned folder
4. In GitHub Desktop, you'll see all files listed as changes
5. Write a commit message like "Initial commit"
6. Click **"Commit to main"**
7. Click **"Push origin"**

**Option B — Command line**
```bash
# Navigate to the project folder
cd spy-tracker

# Initialize git and push
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/spy-tracker.git
git push -u origin main
```

---

## STEP 3 — Deploy to Vercel

### 3.1 Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com) and log in (use "Continue with GitHub")
2. Click **"Add New..."** → **"Project"**
3. You'll see your GitHub repos listed — find `spy-tracker` and click **"Import"**

### 3.2 Configure environment variables

**This is the most important step. Do not skip it.**

Before clicking Deploy, scroll down to **"Environment Variables"** and add these two:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL (from Step 1.3) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key (from Step 1.3) |

To add each one:
1. Type the variable name in the "Name" field
2. Paste the value in the "Value" field
3. Click **"Add"**
4. Repeat for the second variable

### 3.3 Deploy

1. Leave all other settings as default (Vercel auto-detects Next.js)
2. Click **"Deploy"**
3. Wait ~2 minutes while it builds
4. You'll see a success screen with a URL like `spy-tracker-abc123.vercel.app`
5. Click **"Visit"** to open your live app

---

## STEP 4 — Get a Clean URL (Optional)

Vercel gives you a URL like `spy-tracker-abc123.vercel.app` by default. To get a cleaner one:

1. In Vercel, go to your project → **"Settings"** → **"Domains"**
2. You can either:
   - Add your own custom domain (e.g. `trades.yourdomain.com`) if you own one
   - Or just use the default Vercel URL — it works fine

---

## STEP 5 — Test It

1. Open your live URL
2. Go to **Pre-Market** tab and fill in today's game plan
3. Go to **Journal** tab and log a test trade
4. Open the same URL on your phone — the trade should already be there ✓
5. Open it on another computer — same data ✓

If you see a "Connection Error" screen, double-check your environment variables in Vercel (Step 3.2).

---

## How to Update the App Later

When you want to make changes:

1. Edit the files locally
2. Commit and push to GitHub
3. Vercel automatically detects the push and redeploys in ~1 minute

That's it — no manual deploy steps needed after the initial setup.

---

## Troubleshooting

**"Connection Error" on the app**
→ Your environment variables are wrong or missing. Go to Vercel → Project → Settings → Environment Variables and verify both values match exactly what's in Supabase.

**"Success" in SQL editor but no tables showing**
→ Go to Supabase → Table Editor in the left sidebar. You should see: trades, game_plans, checklists, day_types.

**Changes not showing after pushing to GitHub**
→ Go to Vercel → your project → "Deployments" tab. You should see a new deployment triggered. If it failed, click on it to see the error log.

**App loads but data doesn't save**
→ Open browser DevTools (F12) → Console tab. Look for red error messages — they'll tell you exactly what's wrong.

---

## File Structure Reference

```
spy-tracker/
├── src/
│   ├── app/
│   │   ├── page.js          ← Main app (all tabs, UI, logic)
│   │   ├── layout.js        ← Next.js layout wrapper
│   │   └── globals.css      ← Global styles + fonts
│   ├── hooks/
│   │   └── useTracker.js    ← All Supabase DB operations
│   └── lib/
│       └── supabase.js      ← Supabase client init
├── supabase-schema.sql      ← Run this in Supabase SQL editor
├── .env.local.example       ← Template for your env vars
├── .gitignore               ← Keeps secrets out of GitHub
├── next.config.js           ← Next.js config
└── package.json             ← Dependencies
```

---

## Security Note

Your `.env.local` file (which contains your real Supabase keys) is in `.gitignore` — it will **never** be uploaded to GitHub. Only Vercel has access to those keys via the environment variables you set in Step 3.2.

The Supabase anon key is safe to expose in the frontend — it's designed to be public. Access control is handled by Supabase Row Level Security (RLS) if you ever want to add user authentication later.
