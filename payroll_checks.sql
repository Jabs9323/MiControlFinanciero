-- Ejecutar una vez en Supabase SQL Editor. No modifica ingresos ni saldos actuales.
create table if not exists public.payroll_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pay_date date not null,
  received boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,pay_date)
);
create index if not exists payroll_checks_user on public.payroll_checks(user_id,pay_date);
alter table public.payroll_checks enable row level security;
drop policy if exists payroll_checks_read on public.payroll_checks;
drop policy if exists payroll_checks_insert on public.payroll_checks;
drop policy if exists payroll_checks_update on public.payroll_checks;
drop policy if exists payroll_checks_delete on public.payroll_checks;
create policy payroll_checks_read on public.payroll_checks for select to authenticated using((select auth.uid())=user_id);
create policy payroll_checks_insert on public.payroll_checks for insert to authenticated with check((select auth.uid())=user_id);
create policy payroll_checks_update on public.payroll_checks for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy payroll_checks_delete on public.payroll_checks for delete to authenticated using((select auth.uid())=user_id);
