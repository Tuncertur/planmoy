-- DÜZELTME (2. QA denetimi, F-04 — HIGH):
-- paddle-webhook aynı olayın tekrar gönderilmesine (Paddle'ın "at-least-once"
-- teslimatı) veya olayların sıra dışı gelmesine karşı korumasızdı. Bu tablo
-- işlenen her webhook event id'sini tutar; fonksiyon aynı id'yi ikinci kez
-- görürse hiçbir şey yapmadan 200 döner (idempotency).

create table if not exists processed_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table processed_webhook_events enable row level security; -- politika yok: sadece service_role

-- subscriptions'a, webhook olayının Paddle tarafındaki zamanını saklamak için
-- bir sütun ekliyoruz; webhook artık "bu olay şu anki satırdan daha eski mi"
-- diye bakıp daha eskiyse yazmayı atlayabiliyor (sıra-dışı olay koruması).
alter table subscriptions add column if not exists last_event_at timestamptz;
