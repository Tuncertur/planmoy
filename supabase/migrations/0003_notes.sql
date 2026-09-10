-- Boş Alan (Notlar) — FireVibe sürümünde localStorage'da tutuluyordu (cihaza
-- bağlı, hesaba değil). PROJECT_RULES kuralı: kalıcı veri asla localStorage'a
-- yazılmaz. Burada gerçek DB + RLS ile hesaba bağlanıyor.

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  tag text not null default '#fikir',
  tone text not null default 'sky' check (tone in ('sky','sun','mint','rose')),
  created_at timestamptz not null default now()
);

alter table notes enable row level security;

create policy "owner only" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
