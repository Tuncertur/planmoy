-- Kullanıcı tercihleri — sidebar modül sıralaması gibi kişiselleştirmeler
-- burada saklanır (cihaza değil hesaba bağlı, PROJECT_RULES kuralı).

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  personal_nav_order jsonb,
  business_nav_order jsonb,
  cookie_consent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table user_preferences enable row level security;

drop policy if exists "owner only" on user_preferences;
create policy "owner only" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
