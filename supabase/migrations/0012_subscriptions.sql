create table if not exists subscriptions (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan = any(array['free','personal','solo','studio'])),
  paddle_customer_id text null,
  paddle_subscription_id text null,
  status text not null default 'active' check (status = any(array['active','past_due','canceled','paused'])),
  current_period_end timestamptz null,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;
drop policy if exists "owner reads own subscription" on subscriptions;
create policy "owner reads own subscription" on subscriptions
  for select using (auth.uid() = user_id);
