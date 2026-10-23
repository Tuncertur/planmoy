-- 0031 — Webhook olay kaybı riskini kapatır (claim-then-crash).
-- Önceden: olay "işlendi" diye hemen işaretleniyordu; işleme sırasında süreç çökerse
-- (işaret silinemezse) Paddle'ın yeniden denemesi "duplicate" sayılıp olay KAYBOLUYORDU.
-- Şimdi: claim bir kira (lease) alır; olay yalnızca iş BİTTİKTEN sonra completed_at ile
-- tamamlanır. Çöken işleme kira dolunca (varsayılan 5 dk) bir sonraki denemede devralınır.
-- Geriye uyumlu, idempotent; veri silmez.

alter table processed_webhook_events add column if not exists claimed_at timestamptz not null default now();
alter table processed_webhook_events add column if not exists attempts int not null default 1;
alter table processed_webhook_events add column if not exists completed_at timestamptz;

-- Mevcut satırlar eski yöntemle "işlenmiş" kabul edilir (davranış korunur).
update processed_webhook_events set completed_at = processed_at where completed_at is null;

-- Dönüş: 'claimed' (işle) | 'duplicate' (zaten tamamlandı) | 'in-progress' (başkası işliyor, sonra dene)
create or replace function claim_webhook_event(p_event_id text, p_event_type text, p_lease_seconds int default 300)
returns text language plpgsql security definer set search_path = public as $$
declare v_row processed_webhook_events%rowtype;
begin
  insert into processed_webhook_events(event_id, event_type) values (p_event_id, p_event_type)
    on conflict (event_id) do nothing;
  if found then return 'claimed'; end if;

  -- Var olan satırı kilitle (eşzamanlı iki devralma tek kazanan)
  select * into v_row from processed_webhook_events where event_id = p_event_id for update;
  if v_row.completed_at is not null then return 'duplicate'; end if;
  if v_row.claimed_at < now() - make_interval(secs => p_lease_seconds) then
    update processed_webhook_events set claimed_at = now(), attempts = attempts + 1 where event_id = p_event_id;
    return 'claimed';
  end if;
  return 'in-progress';
end $$;

create or replace function complete_webhook_event(p_event_id text)
returns void language sql security definer set search_path = public as $$
  update processed_webhook_events set completed_at = now() where event_id = p_event_id and completed_at is null;
$$;

-- Hata sonrası kirayı hemen bırak: yeniden deneme beklemeden devralabilsin (tamamlanmışa dokunmaz).
create or replace function release_webhook_event(p_event_id text)
returns void language sql security definer set search_path = public as $$
  update processed_webhook_events set claimed_at = 'epoch' where event_id = p_event_id and completed_at is null;
$$;

revoke all on function claim_webhook_event(text, text, int), complete_webhook_event(text), release_webhook_event(text) from public, anon, authenticated;
grant execute on function claim_webhook_event(text, text, int), complete_webhook_event(text), release_webhook_event(text) to service_role;
