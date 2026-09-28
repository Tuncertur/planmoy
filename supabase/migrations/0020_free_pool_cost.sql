-- Ücretsiz havuz: ücretsiz ve anonim (Demo) kullanıcıların o ay harcadığı TOPLAM
-- tahmini dış-API maliyeti. Tutar kodda (cost-cap.ts, FREE_POOL_CAP_USD) $50.
-- Dolunca sadece ücretsiz kullanıcıların canlı Google/Gemini istekleri durur;
-- ücretli planlar bundan etkilenmez (kendi kullanıcı başı tavanlarına tabidir).

create table if not exists free_pool_cost (
  month text primary key,               -- 'YYYY-MM'
  estimated_cost_usd numeric(12,4) not null default 0,
  updated_at timestamptz not null default now()
);
alter table free_pool_cost enable row level security;   -- politika YOK: sadece service_role erişir

-- Havuzdan muaf hesaplar (ör. Apple inceleme/test hesabı, kendi hesabın).
create table if not exists cost_exempt_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
alter table cost_exempt_users enable row level security; -- politika YOK

-- Atomik havuz harcaması: tutar sınırı aşmıyorsa artırır ve true döner, aşıyorsa hiçbir şey yapmaz ve false döner.
create or replace function charge_free_pool(p_month text, p_amount numeric, p_cap numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into free_pool_cost (month, estimated_cost_usd) values (p_month, 0)
    on conflict (month) do nothing;

  update free_pool_cost
     set estimated_cost_usd = estimated_cost_usd + p_amount,
         updated_at = now()
   where month = p_month
     and estimated_cost_usd + p_amount <= p_cap;

  return found;
end;
$$;

-- Bu fonksiyon SADECE Edge Function'lar (service_role) tarafından çağrılabilsin;
-- yoksa herkes çağırıp havuzu doldurarak ücretsiz kullanıcıları kilitleyebilirdi.
revoke all on function charge_free_pool(text, numeric, numeric) from public, anon, authenticated;
grant execute on function charge_free_pool(text, numeric, numeric) to service_role;
