-- DÜZELTME (2. QA denetimi, F-05 — MEDIUM):
-- ai-suggest ve places-autocomplete, saatlik limiti "SELECT count(*) ...
-- sonra INSERT" olarak iki ayrı adımda kontrol ediyordu — F-02 ile aynı kök
-- neden (TOCTOU): eşzamanlı istekler aynı sayımı okuyup ikisi de limiti
-- geçerli sanabiliyordu. Bu, para kaybı riski taşımıyordu (F-02'nin aksine,
-- zaten ayrıca maliyet tavanıyla korunuyorlar) ama aynı deseni taşımak
-- tutarlılık için doğru.
--
-- Çözüm: kullanıcı+surface başına bir transaction-advisory-lock alıp
-- (aynı anda sadece bir istek bu kilidi tutar, diğerleri sırada bekler),
-- kilit içinde sayıp sınır dolmadıysa aynı transaction'da log satırını
-- ekleyen tek bir atomik fonksiyon.

create or replace function check_and_log_ai_usage(p_user_id uuid, p_surface text, p_hourly_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  -- Aynı kullanıcı+surface için eşzamanlı çağrıları serileştirir; kilit
  -- transaction sonunda otomatik serbest kalır.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_surface));

  select count(*) into recent_count
  from ai_usage_log
  where user_id = p_user_id
    and surface = p_surface
    and created_at > now() - interval '1 hour';

  if recent_count >= p_hourly_limit then
    return false;
  end if;

  insert into ai_usage_log (user_id, surface) values (p_user_id, p_surface);
  return true;
end;
$$;

revoke all on function check_and_log_ai_usage(uuid, text, integer) from public, anon, authenticated;
grant execute on function check_and_log_ai_usage(uuid, text, integer) to service_role;
