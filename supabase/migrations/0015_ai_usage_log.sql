create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  surface text not null,
  created_at timestamptz not null default now()
);

alter table ai_usage_log enable row level security;
drop policy if exists "owner reads own usage log" on ai_usage_log;
create policy "owner reads own usage log" on ai_usage_log for select using (auth.uid() = user_id);

create index if not exists ai_usage_log_user_surface_idx on ai_usage_log(user_id, surface, created_at);
