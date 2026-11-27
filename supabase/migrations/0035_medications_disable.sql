-- İlaç modülü kaldırıldı (27.11.2026, Tuncer kararı; ortak-kullanim- MASTER-CHECKLIST H-06).
-- Bu migration VERİ SİLMEZ: tablolar kalır, istemci erişimi tamamen kapanır.
-- Mevcut verinin silinmesi ayrı onaydır (K-07, K-14). Hesap silme (delete-account) cascade ile çalışmaya devam eder.

drop policy if exists "owner manages own medications" on medications;
drop policy if exists "owner manages own logs" on medication_logs;

-- RLS açık kalır ve hiçbir policy yoktur → anon/authenticated için tüm satırlar reddedilir.
alter table medications enable row level security;
alter table medication_logs enable row level security;

revoke all on table medications from anon, authenticated;
revoke all on table medication_logs from anon, authenticated;
