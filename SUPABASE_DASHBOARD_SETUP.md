# Expense Manager Web Dashboard

The viewer is in `web-dashboard/` and is a separate Vite project that can be deployed to Vercel. It is read-only: it only selects a private snapshot and has no edit/delete actions.

## Supabase setup

1. In the existing `snehasagara` Supabase project, run the current contents of `supabase/migrations/20261109000100_expense_manager_snapshots.sql` in the SQL editor. This creates only `public.expense_manager_snapshots`; if the earlier one-token version already exists, it adds the viewer-token column and updates its key/policies in place. It does not alter existing tables.
2. The Android app uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. In this workspace, its Vite config reads those values from the existing `snehasagara/.env` when app-local variables are absent. For a different build machine, set them in the repository root `.env.local` using `.env.example` as the template.
3. The app creates two random codes: a private write token kept on the device, and a separate read-only website access code. Snapshots sync after data changes. Open Home > Backup & Restore and copy the website access code.

Row Level Security checks the app write token for upserts and the website access code for selects. Treat the website code as a password: anyone who has it can view the financial snapshot, but it does not grant write or delete access.

## Vercel setup

1. Import this repository into Vercel and set **Root Directory** to `web-dashboard`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings > Environment Variables. Use the same Supabase project values as `snehasagara`; the anon key is intended for browser clients. Never use a service-role key in the website or app.
3. Deploy. The dashboard prompts for the access code copied from the app.

## Data and privacy

The app snapshots its existing Preferences and localStorage stores into one JSONB payload. The website sends `x-expense-view-token` and only runs a `select`; app writes require the separate private `x-expense-sync-token`. Snapshot data includes personal financial records, so share the website access code only with trusted viewers.
