-- 0030 (HAZIRLANDI, UYGULANMADI): hesap silme denetim kaydı (veri saklama yükümlülükleri ayrı yönetilir).
-- Kullanıcı silindiğinde subscriptions satırı cascade ile gider; faturalama/iptal kanıtı için YALNIZCA kişisel
-- olmayan asgari bilgi tutulur: kullanıcı kimliğinin SHA-256 özeti (kimlik değil), Paddle abonelik kimliği, iptal sonucu.
-- E-posta/ad/içerik TUTULMAZ. Paddle'daki müşteri/işlem/fatura kayıtlarına dokunulmaz (Paddle MoR olarak saklar).
-- Yalnızca service_role (RLS açık, politika yok). Geri alma: drop table account_deletion_log;

create table if not exists account_deletion_log (
  id bigint generated always as identity primary key,
  logged_at timestamptz not null default now(),
  user_hash text not null,              -- sha256(user_id) hex
  paddle_subscription_id text,
  paddle_status_before text,            -- Paddle'ın bildirdiği durum (iptalden önce)
  subscription_canceled boolean not null,
  outcome text not null check (outcome = any(array['deleted','cancel-failed','delete-failed','unverifiable'])),
  note text
);
alter table account_deletion_log enable row level security;
