-- 0027 (HAZIRLANDI, UYGULANMADI): create-checkout için eşzamanlı/ardışık checkout isteklerini
-- tek işleme indirger (çift abonelik engeli). Yalnızca service_role erişir.
--
-- Uygulama sırası: ÖNCE bu migration, SONRA create-checkout deploy (tablo yoksa fonksiyon fail-closed
-- "provider-error" döner; ödeme açılmaz).
-- Geri alma: drop table if exists checkout_locks;  (başka tablo/veriye bağımlılığı yok)

create table if not exists checkout_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan = any(array['personal','solo','studio'])),
  transaction_id text null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table checkout_locks enable row level security; -- politika YOK: yalnızca service_role (RLS'i atlar)
