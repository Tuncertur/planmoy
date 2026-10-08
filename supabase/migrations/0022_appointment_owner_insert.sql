-- DÜZELTME (2. QA denetimi, F-03 — HIGH):
-- Herkese açık rezervasyon formu (PublicBookingScreen) owner_id'yi HİÇ
-- göndermiyordu — oturum açmış bir kullanıcı bile olsa appointment satırı
-- her zaman owner_id=null olarak oluşuyordu. "customer views own
-- appointments" politikası (auth.uid()=owner_id) bu yüzden hiçbir zaman
-- tetiklenemiyordu ve CalendarScreen'deki "randevularım" sorgusu
-- (eq owner_id=userId) her zaman boş dönüyordu — ölü kod + kırık özellik.
--
-- Gerçek testte doğrulanan neden: oturum açmış, işletme sahibi OLMAYAN bir
-- kullanıcının appointments'a owner_id=kendi id'si ile INSERT edebileceği
-- hiçbir politika yoktu ("public can request appointment" owner_id IS NULL
-- şartı koyuyordu, "business owner manages appointments" ise sadece işletme
-- sahibini kapsıyordu).

drop policy if exists "logged in customer requests own appointment" on appointments;
create policy "logged in customer requests own appointment" on appointments
  for insert
  with check (status = 'pending' and owner_id = auth.uid());
