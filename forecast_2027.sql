-- Ejecutar en Supabase SQL Editor. No borra datos existentes.
create table if not exists public.financial_scenarios (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 fiscal_year integer not null check (fiscal_year between 2020 and 2100),
 month smallint not null check (month between 1 and 12),
 kind text not null check (kind in ('income','expense')),
 category text not null check (length(category) between 1 and 100),
 scenario text not null check (scenario in ('aop','forecast')),
 amount numeric(12,2) not null check (amount >= 0),
 updated_at timestamptz not null default now(),
 unique(user_id,fiscal_year,month,kind,category,scenario)
);
create index if not exists financial_scenarios_user_year on public.financial_scenarios(user_id,fiscal_year);
alter table public.financial_scenarios enable row level security;
drop policy if exists "scenario_select_own" on public.financial_scenarios;
drop policy if exists "scenario_insert_own" on public.financial_scenarios;
drop policy if exists "scenario_update_own" on public.financial_scenarios;
drop policy if exists "scenario_delete_own" on public.financial_scenarios;
create policy "scenario_select_own" on public.financial_scenarios for select to authenticated using ((select auth.uid())=user_id);
create policy "scenario_insert_own" on public.financial_scenarios for insert to authenticated with check ((select auth.uid())=user_id);
create policy "scenario_update_own" on public.financial_scenarios for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "scenario_delete_own" on public.financial_scenarios for delete to authenticated using ((select auth.uid())=user_id);
-- Un usuario no puede leer los escenarios de otro. Para crear usuarios utiliza Authentication > Users > Invite user.
