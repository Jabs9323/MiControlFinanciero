-- Run once in Supabase SQL Editor. Preserves existing budget rows.
alter table public.budget_items
 add column if not exists due_month smallint check (due_month between 1 and 12);
-- Month of actual annual renewal; null means a monthly reserve instead of pretending we know payment timing.
create index if not exists budget_items_user_due on public.budget_items(user_id,due_month);
