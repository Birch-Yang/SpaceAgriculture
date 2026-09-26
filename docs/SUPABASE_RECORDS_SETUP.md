# Activate Records and Player Rank with Supabase

> Project check on 2026-09-26: the owner ran migrations 002–004, and one local production smoke run was saved, ranked, reported, replayed and then removed. The steps below remain useful for another environment or the hosted Vercel deployment.

The app can play and generate a local fallback report without credentials. Public Records and Player Rank require a saved mission in Supabase. No database keys should be committed to Git or pasted into a public chat.

## 1. Create the project and schema

1. In the [Supabase dashboard](https://supabase.com/dashboard), create or select the project for agronaut.
2. Open **SQL Editor**. Run these files, in order, using the contents from this repository:
   - `supabase/migrations/202609260001_create_runs.sql`
   - `supabase/migrations/202609260002_submission_claims.sql`
   - `supabase/migrations/202609260003_mission_control.sql`
   - `supabase/migrations/202609260004_submission_recovery.sql`
   If `runs` already exists and the SQL Editor says policy `Public results are readable` already exists, do not rerun 001. Copy all of [`supabase/SETUP_REMAINING.sql`](../supabase/SETUP_REMAINING.sql) into a new SQL Editor query and run it once; it applies 002–004 in one transaction. Files in the repository do not automatically appear in the Supabase SQL Editor sidebar.
3. In **Table Editor**, confirm `public.runs` and `public.run_submission_claims` exist. The first migration enables row level security on `runs` and adds an anonymous read policy. Inserts use the server secret.
4. In **Project Settings → API Keys** (or the project's Connect dialog), copy the project URL, the `sb_publishable_...` key, and the `sb_secret_...` key. The secret must never be placed in a `NEXT_PUBLIC_*` variable. Legacy anon/service-role keys also work with the compatibility variable names.

## 2. Configure local development

Copy `.env.example` to `.env.local`, then set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
SUPABASE_SECRET_KEY=sb_secret_YOUR_KEY
SUBMISSION_HASH_SECRET=YOUR_PRIVATE_RANDOM_STRING_AT_LEAST_32_CHARACTERS
```

Restart `npm run dev` after changing environment variables. Open `/api/leaderboard?category=overall`. It should return `{"category":"overall","rows":[],"total":0,"current":null}` on a new database, not HTTP 503. A 503 message about configuration means the URL or publishable key is missing; a general 503 often means the migration, policy or project connection is wrong.

## 3. Configure deployment

In Vercel, open the agronaut project → **Settings → Environment Variables**. Add the same four variables for each environment you use (Production and/or Preview). Keep `SUPABASE_SECRET_KEY` and `SUBMISSION_HASH_SECRET` server-only. Redeploy after saving them; previous deployments do not receive newly added values. If Vercel Authentication blocks public visitors, adjust the deployment's access setting before external playtesting.

## 4. Verify a real run

1. Start a mission from the landing page, finish it and open View Report. The submit response at `POST /api/runs` must include `saved: true`; `saved: false` means the result is local only and cannot have a public rank.
2. Return to the landing page and open **Records** or **Player Rank**. The table should contain the run, and the latest saved run on this browser should show its rank for each of the five categories. Equal scores share one rank.
3. Check `/api/leaderboard?category=overall` for `total > 0`. The report's saved run ID should exist in `public.runs` in the Supabase Table Editor.
4. Player Rank uses a browser-local pointer to the latest saved run. A new browser/device or cleared site storage has no personal pointer, though the run remains on the public leaderboard. There is no login-based identity yet.
5. If the report says the save failed, use its retry control after fixing configuration. Do not start repeated AI submissions just to test database access.

The official [Supabase API key guide](https://supabase.com/docs/guides/getting-started/api-keys) explains publishable versus secret keys. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) documents public read policies. [Vercel environment variables](https://vercel.com/docs/environment-variables) explains environment scopes and redeployment.
