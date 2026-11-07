-- GÜVENLİK DÜZELTMESİ (kırmızı takım testi, düşük): işletme sahibi, "business owner manages appointments" politikası (ALL, WITH CHECK = USING)
-- sayesinde randevunun owner_id'sini BAŞKA bir kullanıcıya atayabiliyordu (o kullanıcının "randevularım" ekranına sahte randevu düşürme).
-- İstemci (auth.uid() dolu) için owner_id: eklerken yalnızca NULL ya da kendisi; güncellerken DEĞİŞTİRİLEMEZ. service_role (auth.uid() boş) etkilenmez.
-- Geri alma: drop trigger appointments_guard_owner on appointments; drop function guard_appointment_owner();
create or replace function guard_appointment_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- servis akışı (webhook/edge) — istemci değil
  end if;
  if tg_op = 'INSERT' then
    if new.owner_id is not null and new.owner_id <> auth.uid() then
      raise exception 'owner_id baskasina atanamaz' using errcode = '42501';
    end if;
  elsif new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id degistirilemez' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_guard_owner on appointments;
create trigger appointments_guard_owner
  before insert or update on appointments
  for each row execute function guard_appointment_owner();
