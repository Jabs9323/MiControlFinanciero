-- Mi Control Financiero: saldos y checklist. Ejecuta en SQL Editor.
create table if not exists public.money_accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 account_type text not null check(account_type in ('bank','cash','credit')),
 name text not null check(length(name) between 1 and 80),
 balance numeric(14,2) not null default 0 check(balance >= 0),
 updated_at timestamptz not null default now(),
 unique(user_id,account_type,name)
);
create index if not exists money_accounts_user on public.money_accounts(user_id);
alter table public.money_accounts enable row level security;
drop policy if exists money_select_own on public.money_accounts;
drop policy if exists money_insert_own on public.money_accounts;
drop policy if exists money_update_own on public.money_accounts;
drop policy if exists money_delete_own on public.money_accounts;
create policy money_select_own on public.money_accounts for select to authenticated using((select auth.uid())=user_id);
create policy money_insert_own on public.money_accounts for insert to authenticated with check((select auth.uid())=user_id);
create policy money_update_own on public.money_accounts for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy money_delete_own on public.money_accounts for delete to authenticated using((select auth.uid())=user_id);
create table if not exists public.payment_checks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 budget_id uuid not null references public.budget_items(id) on delete cascade,
 fiscal_year integer not null check(fiscal_year between 2020 and 2100),
 month smallint not null check(month between 1 and 12),
 is_paid boolean not null default false,
 paid_at timestamptz,
 updated_at timestamptz not null default now(),
 unique(user_id,budget_id,fiscal_year,month)
);
create index if not exists payment_checks_user_month on public.payment_checks(user_id,fiscal_year,month);
alter table public.payment_checks enable row level security;
drop policy if exists checks_select_own on public.payment_checks;
drop policy if exists checks_insert_own on public.payment_checks;
drop policy if exists checks_update_own on public.payment_checks;
drop policy if exists checks_delete_own on public.payment_checks;
create policy checks_select_own on public.payment_checks for select to authenticated using((select auth.uid())=user_id);
create policy checks_insert_own on public.payment_checks for insert to authenticated with check((select auth.uid())=user_id);
create policy checks_update_own on public.payment_checks for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy checks_delete_own on public.payment_checks for delete to authenticated using((select auth.uid())=user_id);
-- Refuerza el vínculo de check y presupuesto: evita marcar presupuestos de otro usuario.
create or replace function public.validate_payment_check_ownership()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
 if not exists(select 1 from public.budget_items b where b.id=new.budget_id and b.user_id=new.user_id) then
  raise exception 'Budget item does not belong to user';
 end if;
 return new;
end;
$$;
drop trigger if exists payment_check_validate_owner on public.payment_checks;
create trigger payment_check_validate_owner before insert or update on public.payment_checks for each row execute function public.validate_payment_check_ownership();
