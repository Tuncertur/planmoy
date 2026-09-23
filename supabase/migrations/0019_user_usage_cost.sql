create table if not exists user_usage_cost (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  estimated_cost_usd numeric(10,4) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table user_usage_cost enable row level security;
drop policy if exists "owner reads own usage" on user_usage_cost;
create policy "owner reads own usage" on user_usage_cost for select using (auth.uid() = user_id);
