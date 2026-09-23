create table if not exists emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table emergency_contacts enable row level security;
drop policy if exists "owner manages own contacts" on emergency_contacts;
create policy "owner manages own contacts" on emergency_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
