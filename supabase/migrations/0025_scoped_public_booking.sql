-- DÜZELTME (2. QA denetimi, F-06 — MEDIUM):
-- 0007_public_booking.sql'deki "using (true)" politikaları RLS satır
-- bazlıdır, sütun bazlı değildir — bu yüzden "sadece temel alanlar"
-- niyeti gerçekte işlemiyordu: anon bir istemci tek bir REST çağrısıyla
-- (a) businesses tablosunun TÜM sütunlarını (phone/address dahil) ve
-- (b) platformdaki TÜM işletmelerin services/professionals'ını, hedeflenen
-- slug'la sınırlı olmadan okuyabiliyordu. Gerçek testte doğrulandı.
--
-- Çözüm: get-shared-event/get-shared-profile'daki ile aynı desen — ham
-- "using(true)" politikalarını kaldır, tek bir business_id'ye göre
-- SADECE gereken alanları döndüren bir service-role Edge Function
-- (get-public-booking-info) ekle.

drop policy if exists "public reads business basics" on businesses;
drop policy if exists "public reads services" on services;
drop policy if exists "public reads professionals" on professionals;
