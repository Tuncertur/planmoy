#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
pg_start
M=0031_webhook_event_lease.sql
reset_db 0012_subscriptions.sql 0023_webhook_idempotency.sql
q "insert into processed_webhook_events(event_id,event_type) values ('eski','subscription.updated')" >/dev/null
echo "0031-1 migration idempotent, eski satir tamamlanmis sayilir"
run_mig $M >/dev/null; assert_eq "migration basarili" 0 "$?"
run_mig $M >/dev/null; assert_eq "ikinci calistirma basarili" 0 "$?"
assert_eq "eski satir completed" t "$(q "select completed_at is not null from processed_webhook_events where event_id='eski'")"
echo "0031-2 claim/duplicate/in-progress"
assert_eq "ilk claim" claimed "$(q "select claim_webhook_event('e1','subscription.created')")"
assert_eq "tamamlanmadan ikinci claim: in-progress" in-progress "$(q "select claim_webhook_event('e1','subscription.created')")"
q "select complete_webhook_event('e1')" >/dev/null
assert_eq "tamamlandiktan sonra duplicate" duplicate "$(q "select claim_webhook_event('e1','subscription.created')")"
assert_eq "eski olay duplicate" duplicate "$(q "select claim_webhook_event('eski','x')")"
echo "0031-3 CRASH: claim sonrasi cokus -> kira dolunca devralinir (olay kaybolmaz)"
assert_eq "e2 claim" claimed "$(q "select claim_webhook_event('e2','subscription.updated')")"
q "update processed_webhook_events set claimed_at = now() - interval '10 minutes' where event_id='e2'" >/dev/null   # cokus simulasyonu: kira eskidi, tamamlanmadi
assert_eq "kira dolunca devralinir" claimed "$(q "select claim_webhook_event('e2','subscription.updated')")"
assert_eq "deneme sayisi 2" 2 "$(q "select attempts from processed_webhook_events where event_id='e2'")"
assert_eq "devralindiktan sonra baskasi in-progress" in-progress "$(q "select claim_webhook_event('e2','subscription.updated')")"
echo "0031-4 release: hata sonrasi hemen yeniden denenebilir; tamamlanmisa dokunmaz"
q "select release_webhook_event('e2')" >/dev/null
assert_eq "release sonrasi claim" claimed "$(q "select claim_webhook_event('e2','subscription.updated')")"
q "select complete_webhook_event('e2'); select release_webhook_event('e2')" >/dev/null
assert_eq "tamamlanmis release ile acilmaz" duplicate "$(q "select claim_webhook_event('e2','x')")"
echo "0031-5 yetki: anon/authenticated calistiramaz"
r=$(P -d t -c "set role authenticated; select claim_webhook_event('z','x')" >/dev/null 2>&1 && echo kabul || echo red)
assert_eq "authenticated red" red "$r"
r=$(P -d t -c "set role service_role; select claim_webhook_event('z','x')" >/dev/null 2>&1 && echo kabul || echo red)
assert_eq "service_role kabul" kabul "$r"
summary
