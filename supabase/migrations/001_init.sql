-- Enable pgvector for semantic search (optional)
create extension if not exists vector;

-- ── Transactions ──────────────────────────────────────────────────────────────
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  date        date not null,
  description text not null,
  amount      numeric(12, 2) not null,
  category    text not null default 'Other',
  merchant    text,
  source      text not null default 'csv' check (source in ('csv', 'receipt', 'manual')),
  created_at  timestamptz not null default now()
);

-- Index for fast per-user queries
create index if not exists transactions_user_date on transactions (user_id, date desc);
create index if not exists transactions_user_category on transactions (user_id, category);

-- RLS: users can only see their own transactions
alter table transactions enable row level security;
create policy "users see own transactions" on transactions
  for all using (auth.uid()::text = user_id);

-- ── Monthly aggregates (pre-computed for speed) ───────────────────────────────
create table if not exists monthly_aggregates (
  user_id  text not null,
  year     int not null,
  month    int not null,
  category text not null,
  total    numeric(12, 2) not null,
  count    int not null,
  avg      numeric(12, 2) not null,
  primary key (user_id, year, month, category)
);

alter table monthly_aggregates enable row level security;
create policy "users see own aggregates" on monthly_aggregates
  for all using (auth.uid()::text = user_id);

-- Function to refresh aggregates for a user
create or replace function refresh_monthly_aggregates(p_user_id text)
returns void language plpgsql security definer as $$
begin
  delete from monthly_aggregates where user_id = p_user_id;
  insert into monthly_aggregates (user_id, year, month, category, total, count, avg)
  select
    user_id,
    extract(year from date)::int,
    extract(month from date)::int,
    category,
    sum(abs(amount)),
    count(*),
    avg(abs(amount))
  from transactions
  where user_id = p_user_id
  group by user_id, extract(year from date), extract(month from date), category;
end;
$$;

-- ── Budgets ───────────────────────────────────────────────────────────────────
create table if not exists budgets (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  category      text not null,
  limit_amount  numeric(12, 2) not null,
  period        text not null default 'monthly' check (period in ('monthly', 'weekly')),
  created_at    timestamptz not null default now(),
  unique (user_id, category)
);

alter table budgets enable row level security;
create policy "users see own budgets" on budgets
  for all using (auth.uid()::text = user_id);

-- ── User context / preferences ────────────────────────────────────────────────
create table if not exists user_context (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  key        text not null,
  value      text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table user_context enable row level security;
create policy "users see own context" on user_context
  for all using (auth.uid()::text = user_id);
