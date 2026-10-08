-- DÜZELTME (2. QA denetimi, F-02 — CRITICAL):
-- checkAndChargeCost() kullanıcı-başı tavanı SELECT -> JS karşılaştırma -> UPSERT
-- olarak 3 ayrı adımda yapıyordu; bu adımlar arasında eşzamanlı istekler aynı
-- "current" değerini okuyup ikisi de geçerli sayılabiliyordu (TOCTOU), ve son
-- yazan kazandığı için gerçek toplam harcama veritabanına hiç yansımıyordu
-- (kayıp güncelleme). Kanıt: /tmp/race_poc/poc.js — 5 eşzamanlı istek, tavan
-- $1.2, hepsi "allowed" döndü, gerçek harcama $1.5 oldu ama ledger $1.1 yazdı.
--
-- charge_free_pool()'daki ATOMİK "UPDATE ... WHERE ... <= cap" deseni burada
-- da uygulanıyor: tek bir SQL ifadesi, satır kilidiyle korunuyor.

create or replace function charge_user_cost(p_user_id uuid, p_month text, p_amount numeric, p_cap numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_usage_cost (user_id, month, estimated_cost_usd) values (p_user_id, p_month, 0)
    on conflict (user_id, month) do nothing;

  update user_usage_cost
     set estimated_cost_usd = estimated_cost_usd + p_amount,
         updated_at = now()
   where user_id = p_user_id
     and month = p_month
     and estimated_cost_usd + p_amount <= p_cap;

  return found;
end;
$$;

-- charge_free_pool ile aynı gerekçe: sadece Edge Function'lar (service_role)
-- çağırabilsin, yoksa herkes çağırıp başka bir kullanıcının tavanını manipüle
-- edebilirdi (p_user_id serbest parametre olduğu için).
revoke all on function charge_user_cost(uuid, text, numeric, numeric) from public, anon, authenticated;
grant execute on function charge_user_cost(uuid, text, numeric, numeric) to service_role;
