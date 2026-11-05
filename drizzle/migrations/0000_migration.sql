create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, currency text not null default 'INR', monthly_budget numeric not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "own delete" on public.profiles for delete to authenticated using (auth.uid() = id);

create table public.income (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  amount numeric not null, source text not null, description text, transaction_date date not null,
  is_recurring boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.expenses (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  amount numeric not null, category text not null, description text, transaction_date date not null,
  is_recurring boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.budgets (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  month date not null, category text not null, limit_amount numeric not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, month, category));
create table public.savings_goals (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  name text not null, target_amount numeric not null, saved_amount numeric not null default 0, target_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.savings_contributions (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  goal_id uuid not null references public.savings_goals(id) on delete cascade, amount numeric not null, note text,
  contributed_on date not null, created_at timestamptz not null default now());
create table public.recurring_rules (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  type text not null check (type in ('income','expense')), amount numeric not null, category_or_source text not null,
  description text, day_of_month integer not null check (day_of_month between 1 and 31), is_active boolean not null default true,
  last_logged_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.ai_insights (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
  prompt text, response jsonb, kind text not null check (kind in ('analysis','question')), created_at timestamptz not null default now());

do $$ declare t text; begin
  foreach t in array array['income','expenses','budgets','savings_goals','savings_contributions','recurring_rules','ai_insights'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own select" on public.%I for select to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own insert" on public.%I for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format('create policy "own update" on public.%I for update to authenticated using (auth.uid() = user_id)', t);
    execute format('create policy "own delete" on public.%I for delete to authenticated using (auth.uid() = user_id)', t);
    execute format('create index on public.%I (user_id)', t);
  end loop; end $$;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['profiles','income','expenses','budgets','savings_goals','recurring_rules'] loop
    execute format('create trigger trg_updated before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop; end $$;

-- keep goal saved_amount in sync with contributions
create or replace function public.sync_goal_saved() returns trigger language plpgsql security definer set search_path = public as $$
declare gid uuid; begin
  gid := coalesce(new.goal_id, old.goal_id);
  update public.savings_goals set saved_amount = coalesce((select sum(amount) from public.savings_contributions where goal_id = gid),0) where id = gid;
  if tg_op = 'UPDATE' and old.goal_id <> new.goal_id then
    update public.savings_goals set saved_amount = coalesce((select sum(amount) from public.savings_contributions where goal_id = old.goal_id),0) where id = old.goal_id;
  end if;
  return null; end $$;
create trigger trg_sync_goal after insert or update or delete on public.savings_contributions for each row execute function public.sync_goal_saved();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1))) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();