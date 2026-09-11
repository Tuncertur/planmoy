-- Herkese açık rezervasyon sayfası (/book/:slug) için: hesabı olmayan
-- ziyaretçiler bir işletmeye randevu TALEBİ oluşturabilir (durum daima
-- 'pending' — işletme sahibi onaylayana kadar kesinleşmez).

drop policy if exists "public can request appointment" on appointments;
create policy "public can request appointment" on appointments
  for insert
  with check (status = 'pending' and owner_id is null);

-- Ziyaretçinin, işletmenin adını/hizmetini görebilmesi için (rezervasyon
-- formunu doldurabilmesi için) genel okuma izni — sadece temel alanlar.
drop policy if exists "public reads business basics" on businesses;
create policy "public reads business basics" on businesses
  for select using (true);

drop policy if exists "public reads services" on services;
create policy "public reads services" on services
  for select using (true);

drop policy if exists "public reads professionals" on professionals;
create policy "public reads professionals" on professionals
  for select using (true);
