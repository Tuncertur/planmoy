create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;
drop policy if exists "owner manages own notifications" on notifications;
create policy "owner manages own notifications" on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
