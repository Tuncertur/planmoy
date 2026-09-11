-- Profil Paylaş — kullanıcının kendi seçtiği kişilere gönderebileceği bir
-- tanışma/bağlantı kartı. BİLİNÇLİ TASARIM KARARI: herkese açık, aranabilir
-- bir "yakınımdakiler" dizini DEĞİL — sadece paylaşım linkini bilen kişi
-- görebilir (Etkinlik davetleriyle aynı model). Ham RLS ile herkese açık
-- okuma izni VERİLMİYOR; erişim yalnızca get-shared-profile Edge
-- Function'ı üzerinden, token doğrulanarak sağlanıyor.

create table if not exists public_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  nickname text not null,
  age integer not null check (age >= 18),
  gender text not null check (gender in ('kadin', 'erkek')),
  plans text,
  places text,
  interests text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public_profiles enable row level security;

drop policy if exists "owner only" on public_profiles;
create policy "owner only" on public_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- NOT: kasıtlı olarak herkese açık bir "select using (true)" politikası
-- eklenmiyor — bu, anon bir kullanıcının token bilmeden TÜM profilleri
-- listeleyebilmesine yol açardı. Paylaşım linkiyle görüntüleme, service
-- role ile çalışan get-shared-profile Edge Function'ı üzerinden olacak.
