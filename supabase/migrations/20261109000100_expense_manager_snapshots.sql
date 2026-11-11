create table if not exists public.expense_manager_snapshots (
  sync_token text not null,
  viewer_token text not null,
  snapshot_key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (viewer_token, snapshot_key)
);

-- Upgrade the earlier one-token table shape in place if its first migration was already applied.
alter table public.expense_manager_snapshots
  add column if not exists viewer_token text;

update public.expense_manager_snapshots
set viewer_token = sync_token
where viewer_token is null;

alter table public.expense_manager_snapshots
  alter column viewer_token set not null;

alter table public.expense_manager_snapshots
  drop constraint if exists expense_manager_snapshots_pkey;

alter table public.expense_manager_snapshots
  add constraint expense_manager_snapshots_pkey primary key (viewer_token, snapshot_key);

alter table public.expense_manager_snapshots enable row level security;

revoke all on table public.expense_manager_snapshots from public;
grant select, insert, update on table public.expense_manager_snapshots to anon, authenticated;

drop policy if exists "Read own expense manager snapshot" on public.expense_manager_snapshots;
create policy "Read own expense manager snapshot"
  on public.expense_manager_snapshots
  for select
  to anon, authenticated
  using (
    viewer_token = coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-expense-view-token',
      ''
    )
  );

drop policy if exists "Upsert own expense manager snapshot" on public.expense_manager_snapshots;
create policy "Upsert own expense manager snapshot"
  on public.expense_manager_snapshots
  for insert
  to anon, authenticated
  with check (
    sync_token = coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-expense-sync-token',
      ''
    )
  );

drop policy if exists "Update own expense manager snapshot" on public.expense_manager_snapshots;
create policy "Update own expense manager snapshot"
  on public.expense_manager_snapshots
  for update
  to anon, authenticated
  using (
    sync_token = coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-expense-sync-token',
      ''
    )
  )
  with check (
    sync_token = coalesce(
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-expense-sync-token',
      ''
    )
  );
