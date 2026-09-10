-- StyleSync gardırop fotoğrafları için depolama alanı.
-- Her kullanıcı yalnızca kendi klasörüne (userId/...) erişebilir.

insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do nothing;

drop policy if exists "wardrobe owner read" on storage.objects;
create policy "wardrobe owner read" on storage.objects
  for select using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "wardrobe owner write" on storage.objects;
create policy "wardrobe owner write" on storage.objects
  for insert with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "wardrobe owner delete" on storage.objects;
create policy "wardrobe owner delete" on storage.objects
  for delete using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
