-- 0029 (HAZIRLANDI, UYGULANMADI): abonelik yönetimi için alanlar.
--  cancel_at / scheduled_action : Paddle'daki bekleyen iptal/duraklatma (erişim bu tarihe kadar sürer)
--  past_due_since               : ödeme sorunu başlangıcı -> 3 günlük hoşgörü süresi (yoksa erişim YOK: fail-closed)
--  pending_plan / pending_plan_at : DÖNEM SONUNDA uygulanacak plan düşürme (Paddle'da dönem sonuna zamanlanamaz)
-- Veri değişikliği YOK (backfill bilerek yok: bozuk past_due satırları hoşgörüyle erişim kazanmasın).
-- Uygulama sırası: 0028 -> 0029 -> (ardından webhook/checkout/yeni fonksiyonlar deploy). Tablo yeniden yazılmaz (nullable sütunlar).
-- Geri alma: alter table subscriptions drop column ... (yeni sütunlar; mevcut veriye bağımlılık yok).

alter table subscriptions
  add column if not exists cancel_at timestamptz,
  add column if not exists scheduled_action text,
  add column if not exists past_due_since timestamptz,
  add column if not exists pending_plan text,
  add column if not exists pending_plan_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_scheduled_action_check') then
    alter table subscriptions add constraint subscriptions_scheduled_action_check
      check (scheduled_action is null or scheduled_action = any(array['cancel','pause']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_pending_plan_check') then
    alter table subscriptions add constraint subscriptions_pending_plan_check
      check (pending_plan is null or pending_plan = any(array['personal','solo','studio']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_pending_pair_check') then
    alter table subscriptions add constraint subscriptions_pending_pair_check
      check ((pending_plan is null) = (pending_plan_at is null));
  end if;
end $$;
-- RLS: mevcut "owner reads own subscription" politikası yeni sütunları da kapsar; istemci yazamaz (yazma politikası yok).
