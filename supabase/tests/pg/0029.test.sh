#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
pg_start
U1=11111111-1111-4111-8111-111111111111; U2=22222222-2222-4222-8222-222222222222
BASE=(0012_subscriptions.sql 0023_webhook_idempotency.sql)
M=0029_subscription_management_fields.sql

echo "0029-1 mevcut veri aynen korunur, yeni sütunlar NULL"
reset_db "${BASE[@]}"
q "insert into subscriptions(user_id,plan,status,paddle_subscription_id) values ('$U1','solo','past_due','sub_x'),('$U2','personal','active','sub_y')" >/dev/null
run_mig $M >/dev/null; assert_eq "migration basarili" 0 "$?"
assert_eq "satirlar ayni" "solo|past_due|sub_x;personal|active|sub_y" "$(q "select string_agg(plan||'|'||status||'|'||paddle_subscription_id, ';' order by user_id) from subscriptions")"
assert_eq "yeni sutunlar NULL (backfill yok -> past_due erisim kazanmaz)" "0" "$(q "select count(*) from subscriptions where cancel_at is not null or scheduled_action is not null or past_due_since is not null or pending_plan is not null or pending_plan_at is not null")"
echo "0029-2 yeniden calistirma guvenli (idempotent)"
run_mig $M >/dev/null; assert_eq "ikinci calistirma basarili" 0 "$?"
echo "0029-3 kisitlar gecersiz degerleri reddeder"
rej(){ if q "$1" >/dev/null 2>&1; then echo "kabul"; else echo "red"; fi; }
assert_eq "scheduled_action gecersiz" red "$(rej "update subscriptions set scheduled_action='delete' where user_id='$U1'")"
assert_eq "pending_plan gecersiz (free)" red "$(rej "update subscriptions set pending_plan='free', pending_plan_at=now() where user_id='$U1'")"
assert_eq "pending_plan tek basina (tarih yok)" red "$(rej "update subscriptions set pending_plan='personal' where user_id='$U1'")"
assert_eq "pending_plan + tarih gecerli" kabul "$(rej "update subscriptions set pending_plan='personal', pending_plan_at=now() where user_id='$U1'")"
assert_eq "scheduled_action cancel gecerli" kabul "$(rej "update subscriptions set scheduled_action='cancel', cancel_at=now() where user_id='$U1'")"
summary
