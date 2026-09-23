create table if not exists places_search_cache (
  cache_key text primary key,
  results jsonb not null default '[]',
  cached_at timestamptz not null default now()
);

alter table places_search_cache enable row level security;
drop policy if exists "public read" on places_search_cache;
create policy "public read" on places_search_cache for select using (true);
