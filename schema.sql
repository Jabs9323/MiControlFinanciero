-- Mi Control Financiero: run once in Supabase SQL Editor (new project).
-- Publish only the project URL and publishable/anon key in config.js.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occurred_on date not null,
  kind text not null check (kind in ('expense','income')),
  amount numeric(12,2) not null check (amount > 0),
  category text not null check (length(category) between 1 and 80),
  description text not null default '',
  payment_method text not null default 'Efectivo',
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date on public.transactions(user_id,occurred_on desc);
alter table public.transactions enable row level security;
create policy "tx_select_own" on public.transactions for select to authenticated using ((select auth.uid())=user_id);
create policy "tx_insert_own" on public.transactions for insert to authenticated with check ((select auth.uid())=user_id);
create policy "tx_update_own" on public.transactions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "tx_delete_own" on public.transactions for delete to authenticated using ((select auth.uid())=user_id);
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  category text not null check (length(category) between 1 and 80),
  amount numeric(12,2) not null check (amount >= 0),
  frequency text not null check (frequency in ('monthly','weekly','biweekly','bimonthly','annual','daily')),
  days_per_week smallint check (days_per_week between 1 and 7),
  due_day smallint check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  constraint daily_needs_days check (frequency <> 'daily' or days_per_week is not null)
);
create index if not exists budget_items_user on public.budget_items(user_id);
alter table public.budget_items enable row level security;
create policy "budget_select_own" on public.budget_items for select to authenticated using ((select auth.uid())=user_id);
create policy "budget_insert_own" on public.budget_items for insert to authenticated with check ((select auth.uid())=user_id);
create policy "budget_update_own" on public.budget_items for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "budget_delete_own" on public.budget_items for delete to authenticated using ((select auth.uid())=user_id);
