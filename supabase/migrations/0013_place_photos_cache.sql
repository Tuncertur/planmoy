create table if not exists place_photos_cache (
  place_id text primary key,
  photo_urls jsonb not null default '[]',
  cached_at timestamptz not null default now()
);

alter table place_photos_cache enable row level security;
drop policy if exists "public read" on place_photos_cache;
create policy "public read" on place_photos_cache for select using (true);

insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;
