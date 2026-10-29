-- Planmoy — ücretli dış API koruması (maliyet rezervasyonu + sayaç + idempotency + proje tavanı).
-- Eklemeli: mevcut tablolar/fonksiyonlar (charge_user_cost, charge_free_pool, check_and_log_ai_usage) DEĞİŞMEZ ve çalışmaya devam eder.
-- Yeni akış: reserve_paid_api() -> sağlayıcı çağrısı -> settle_paid_api(). Hepsi tek SQL işleminde atomik; satır kilitleri eşzamanlılığı serileştirir.
-- UYGULANMADI: production migration ayrı onay gerektirir. Geri alma: yeni tablolar/fonksiyonlar silinebilir; user_usage_cost.text_queries sütunu zararsızdır.

alter table user_usage_cost add column if not exists text_queries integer not null default 0;

-- Proje geneli aylık toplam ücretli API harcaması (tüm kullanıcılar). RLS açık, politika YOK: yalnız service_role.
create table if not exists project_cost_month (
  month text primary key,
  estimated_cost_usd numeric(12,6) not null default 0,
  updated_at timestamptz not null default now()
);
alter table project_cost_month enable row level security;

-- İşlem defteri: rezerve edilen / gerçekleşen / iade edilen tutar. Mutabakat ve anomali raporu için.
create table if not exists paid_api_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  surface text not null,
  idem_key text,
  reserved_usd numeric(12,6) not null check (reserved_usd >= 0),
  actual_usd numeric(12,6),
  counts_query boolean not null default false,
  status text not null default 'reserved' check (status in ('reserved', 'settled', 'refunded')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create unique index if not exists paid_api_ledger_idem_uq on paid_api_ledger (user_id, idem_key) where idem_key is not null;
create index if not exists paid_api_ledger_user_month_idx on paid_api_ledger (user_id, month);
create index if not exists paid_api_ledger_month_surface_idx on paid_api_ledger (month, surface);
alter table paid_api_ledger enable row level security;

-- Rezervasyon: izin varsa kullanıcı sayacı + kullanıcı dolar tavanı + proje tavanı AYNI işlemde artırılır.
--   p_user_cap <= 0  → ücretli API yok (Free). p_query_limit: aylık metin-sorgu hakkı (yalnız p_counts_query=true iken).
--   p_idem_key: aynı anahtarla tekrar gelen istek ÇİFT ücretlendirilmez ('duplicate-request').
--   Dönüş: {"allowed":bool,"reason":text|null,"ledger_id":uuid|null}
create or replace function reserve_paid_api(
  p_user_id uuid, p_month text, p_surface text, p_amount numeric,
  p_user_cap numeric, p_counts_query boolean, p_query_limit integer,
  p_project_cap numeric, p_idem_key text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  u user_usage_cost%rowtype;
  proj numeric;
  existing paid_api_ledger%rowtype;
  new_id uuid;
begin
  if p_amount is null or p_amount < 0 or p_user_cap is null or p_project_cap is null or p_month is null or p_surface is null then
    return jsonb_build_object('allowed', false, 'reason', 'invalid-request', 'ledger_id', null);
  end if;
  if p_user_cap <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'plan-has-no-paid-api', 'ledger_id', null);
  end if;

  -- Aynı kullanıcı için eşzamanlı istekleri sıraya sokar (işlem sonunda otomatik serbest kalır).
  perform pg_advisory_xact_lock(hashtext('paid_api:' || p_user_id::text));

  if p_idem_key is not null then
    select * into existing from paid_api_ledger where user_id = p_user_id and idem_key = p_idem_key;
    if found and existing.status in ('reserved', 'settled') then
      return jsonb_build_object('allowed', false, 'reason', 'duplicate-request', 'ledger_id', existing.id);
    end if;
  end if;

  insert into user_usage_cost (user_id, month, estimated_cost_usd) values (p_user_id, p_month, 0)
    on conflict (user_id, month) do nothing;
  select * into u from user_usage_cost where user_id = p_user_id and month = p_month for update;

  if p_counts_query and u.text_queries >= greatest(coalesce(p_query_limit, 0), 0) then
    return jsonb_build_object('allowed', false, 'reason', 'monthly-query-limit-reached', 'ledger_id', null);
  end if;
  if u.estimated_cost_usd + p_amount > p_user_cap then
    return jsonb_build_object('allowed', false, 'reason', 'monthly-cost-cap-reached', 'ledger_id', null);
  end if;

  insert into project_cost_month (month, estimated_cost_usd) values (p_month, 0) on conflict (month) do nothing;
  select estimated_cost_usd into proj from project_cost_month where month = p_month for update;
  if proj + p_amount > p_project_cap then
    return jsonb_build_object('allowed', false, 'reason', 'project-cap-reached', 'ledger_id', null);
  end if;

  update user_usage_cost
     set estimated_cost_usd = estimated_cost_usd + p_amount,
         text_queries = text_queries + (case when p_counts_query then 1 else 0 end),
         updated_at = now()
   where user_id = p_user_id and month = p_month;
  update project_cost_month set estimated_cost_usd = estimated_cost_usd + p_amount, updated_at = now() where month = p_month;

  if existing.id is not null then   -- aynı anahtar daha önce iade edilmişti: satırı yeniden rezerve et
    update paid_api_ledger
       set status = 'reserved', reserved_usd = p_amount, actual_usd = null, counts_query = p_counts_query,
           month = p_month, surface = p_surface, settled_at = null
     where id = existing.id
     returning id into new_id;
  else
    insert into paid_api_ledger (user_id, month, surface, idem_key, reserved_usd, counts_query)
    values (p_user_id, p_month, p_surface, p_idem_key, p_amount, p_counts_query)
    returning id into new_id;
  end if;
  return jsonb_build_object('allowed', true, 'reason', null, 'ledger_id', new_id);
end;
$$;

-- Kapanış: sağlayıcı ücret yazdıysa gerçek tutarla mutabakat (rezerve ile fark sayaçlara yansır); yazmadıysa (hata/zaman aşımı) tam iade + sorgu hakkı iadesi.
-- Aynı ledger_id'ye ikinci çağrı etkisizdir (çift iade/çift mutabakat yok). Dönüş: işlem yapıldı mı.
create or replace function settle_paid_api(p_ledger_id uuid, p_actual numeric, p_provider_billed boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  l paid_api_ledger%rowtype;
  delta numeric;
begin
  -- Kilit sırası reserve ile AYNI olmalı (önce kullanıcı advisory kilidi, sonra satırlar) — aksi halde kilitlenme (deadlock) riski.
  select * into l from paid_api_ledger where id = p_ledger_id;
  if not found then return false; end if;
  perform pg_advisory_xact_lock(hashtext('paid_api:' || l.user_id::text));
  select * into l from paid_api_ledger where id = p_ledger_id for update;
  if l.status <> 'reserved' then return false; end if;

  if p_provider_billed then
    if p_actual is null or p_actual < 0 then return false; end if;
    delta := p_actual - l.reserved_usd;
    update user_usage_cost set estimated_cost_usd = greatest(estimated_cost_usd + delta, 0), updated_at = now() where user_id = l.user_id and month = l.month;
    update project_cost_month set estimated_cost_usd = greatest(estimated_cost_usd + delta, 0), updated_at = now() where month = l.month;
    update paid_api_ledger set status = 'settled', actual_usd = p_actual, settled_at = now() where id = l.id;
  else
    update user_usage_cost
       set estimated_cost_usd = greatest(estimated_cost_usd - l.reserved_usd, 0),
           text_queries = greatest(text_queries - (case when l.counts_query then 1 else 0 end), 0),
           updated_at = now()
     where user_id = l.user_id and month = l.month;
    update project_cost_month set estimated_cost_usd = greatest(estimated_cost_usd - l.reserved_usd, 0), updated_at = now() where month = l.month;
    update paid_api_ledger set status = 'refunded', actual_usd = 0, settled_at = now() where id = l.id;
  end if;
  return true;
end;
$$;

-- Anomali/maliyet raporu (yalnız service_role): ay içinde en çok harcayanlar ve yüzey bazlı toplam.
create or replace function paid_api_top_spenders(p_month text, p_limit integer default 20)
returns table (user_id uuid, estimated_cost_usd numeric, text_queries integer)
language sql
security definer
set search_path = public
as $$
  select user_id, estimated_cost_usd, text_queries from user_usage_cost
   where month = p_month order by estimated_cost_usd desc limit least(greatest(p_limit, 1), 200);
$$;

revoke all on function reserve_paid_api(uuid, text, text, numeric, numeric, boolean, integer, numeric, text) from public, anon, authenticated;
revoke all on function settle_paid_api(uuid, numeric, boolean) from public, anon, authenticated;
revoke all on function paid_api_top_spenders(text, integer) from public, anon, authenticated;
grant execute on function reserve_paid_api(uuid, text, text, numeric, numeric, boolean, integer, numeric, text) to service_role;
grant execute on function settle_paid_api(uuid, numeric, boolean) to service_role;
grant execute on function paid_api_top_spenders(text, integer) to service_role;
