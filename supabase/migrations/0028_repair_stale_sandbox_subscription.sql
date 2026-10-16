-- 0028 (HAZIRLANDI, UYGULANMADI): TEK KAYITLIK, korumalı veri onarımı + kalıcı denetim tablosu.
--
-- Neden: sandbox test aboneliği sub_01m51ysa3xf4rwtmg4ymwt9nes Paddle'da "canceled" iken, eski
-- webhook sürümü (v12) DB'ye "personal / past_due" yazmış ve düzeltecek yeni olay gelmeyecek.
-- Bu satır create-checkout'u ("payment-issue") ve yeni abonelik olayını ("çift abonelik") bloke ediyor.
--
-- Ne yapar (yalnızca aşağıdaki koşulların HEPSİ doğruysa):
--   * Tam olarak 1 satır paddle_subscription_id = sub_01m51ysa3xf4rwtmg4ymwt9nes taşıyor,
--   * o satır plan='personal' ve status='past_due',
--   -> plan='free', status='canceled' yapar (Paddle'daki gerçek duruma eşitler) ve eski değerleri
--      subscription_repairs'a yazar.
-- Ne YAPMAZ: satır silmez; paddle_subscription_id / paddle_customer_id / last_event_at /
--   current_period_end'e dokunmaz; başka kullanıcıya dokunmaz; ödeme/iptal geçmişi Paddle'dadır, değişmez.
-- Güvenli yeniden çalışır (idempotent): koşullar sağlanmazsa hiçbir şey yapmaz (taze/prod DB'de no-op).
-- Aynı sub kimliği 2+ satırda bulunursa veya güncelleme != 1 satır etkilerse EXCEPTION: tüm migration
-- (uygula.yml --single-transaction) geri alınır.
-- Geri alma: subscription_repairs'taki old_* değerleriyle tek satır UPDATE (aşağıda yorumda).

create table if not exists subscription_repairs (
  id bigint generated always as identity primary key,
  repaired_at timestamptz not null default now(),
  user_id uuid not null, -- FK YOK: denetim kaydı kullanıcı silinse de kalmalı
  paddle_subscription_id text,
  old_plan text,
  old_status text,
  old_last_event_at timestamptz,
  old_updated_at timestamptz,
  new_plan text,
  new_status text,
  reason text not null,
  migration text not null
);
alter table subscription_repairs enable row level security; -- politika YOK: yalnızca service_role

do $$
declare
  v_sub constant text := 'sub_01m51ysa3xf4rwtmg4ymwt9nes';
  v_count int;
  r subscriptions%rowtype;
begin
  select count(*) into v_count from subscriptions where paddle_subscription_id = v_sub;
  if v_count = 0 then
    raise notice '0028: % için kayıt yok (taze veritabanı), işlem yapılmadı', v_sub;
    return;
  end if;
  if v_count > 1 then
    raise exception '0028: % birden fazla satırda bulundu (%), güvenlik için durduruldu', v_sub, v_count;
  end if;

  select * into r from subscriptions where paddle_subscription_id = v_sub for update;
  if r.plan <> 'personal' or r.status <> 'past_due' then
    raise notice '0028: kayıt beklenen durumda değil (plan=%, status=%), dokunulmadı', r.plan, r.status;
    return;
  end if;

  insert into subscription_repairs
    (user_id, paddle_subscription_id, old_plan, old_status, old_last_event_at, old_updated_at, new_plan, new_status, reason, migration)
  values
    (r.user_id, r.paddle_subscription_id, r.plan, r.status, r.last_event_at, r.updated_at, 'free', 'canceled',
     'Paddle (sandbox) aboneliği canceled; eski webhook v12 DB''ye past_due yazmıştı (anında iptal hatası)',
     '0028_repair_stale_sandbox_subscription');

  update subscriptions
     set plan = 'free', status = 'canceled', updated_at = now()
   where user_id = r.user_id
     and paddle_subscription_id = v_sub
     and plan = 'personal'
     and status = 'past_due';
  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception '0028: beklenen 1 satır güncellenmeliydi, % satır etkilendi; geri alınıyor', v_count;
  end if;
  raise notice '0028: 1 satır onarıldı (personal/past_due -> free/canceled), denetim kaydı yazıldı';
end $$;

-- Geri alma (gerekirse, elle):
--   update subscriptions s set plan = a.old_plan, status = a.old_status, updated_at = a.old_updated_at
--     from subscription_repairs a
--    where a.migration = '0028_repair_stale_sandbox_subscription' and s.user_id = a.user_id;
