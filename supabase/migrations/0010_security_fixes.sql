-- GÜVENLİK DÜZELTMESİ 1: appointment_messages "for all" politikası,
-- randevunun HER İKİ tarafının (müşteri VE işletme sahibi) birbirinin
-- mesajlarını silip/düzenleyebilmesine izin veriyordu. SELECT/INSERT
-- thread genelinde kalsın, ama UPDATE/DELETE sadece mesajın yazarına
-- ait olsun.

drop policy if exists "appointment parties access messages" on appointment_messages;

create policy "appointment parties read messages" on appointment_messages
  for select using (
    appointment_id in (
      select a.id from appointments a
      where a.owner_id = auth.uid()
         or a.business_id in (select id from businesses where owner_id = auth.uid())
    )
  );

create policy "appointment parties send messages" on appointment_messages
  for insert with check (
    author_id = auth.uid()
    and appointment_id in (
      select a.id from appointments a
      where a.owner_id = auth.uid()
         or a.business_id in (select id from businesses where owner_id = auth.uid())
    )
  );

create policy "author edits own message" on appointment_messages
  for update using (author_id = auth.uid());

create policy "author deletes own message" on appointment_messages
  for delete using (author_id = auth.uid());

-- GÜVENLİK DÜZELTMESİ 2: herkese açık rezervasyon sayfası (/book/:slug)
-- hesapsız kullanıma açık — hız sınırı olmadan bir kötü niyetli kullanıcı
-- bir işletmenin takvimini sahte "pending" taleplerle doldurabilirdi.
-- Aynı işletmeye saatlik üst limit ekleniyor.

create or replace function enforce_public_booking_rate_limit()
returns trigger as $$
declare
  recent_count integer;
begin
  if new.owner_id is not null then
    return new; -- sadece hesaplı (owner_id dolu) randevular değil, herkese açık talepler sınırlanıyor
  end if;

  select count(*) into recent_count
  from appointments
  where business_id = new.business_id
    and owner_id is null
    and created_at > now() - interval '1 hour';

  if recent_count >= 30 then
    raise exception 'Bu işletme için saatlik randevu talebi limitine ulaşıldı, lütfen daha sonra tekrar deneyin.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists public_booking_rate_limit on appointments;
create trigger public_booking_rate_limit
  before insert on appointments
  for each row execute function enforce_public_booking_rate_limit();
