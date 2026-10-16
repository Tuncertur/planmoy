#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
pg_start
SUB=sub_01m51ysa3xf4rwtmg4ymwt9nes
U1=11111111-1111-4111-8111-111111111111; U2=22222222-2222-4222-8222-222222222222
M=0028_repair_stale_sandbox_subscription.sql
BASE=(0012_subscriptions.sql 0023_webhook_idempotency.sql)
ins(){ q "insert into subscriptions(user_id,plan,paddle_customer_id,paddle_subscription_id,status,current_period_end,last_event_at,updated_at) values $1" >/dev/null; }

echo "0028-1 hedef satir onarilir, baska kullanici ve korunan alanlar degismez"
reset_db "${BASE[@]}"
ins "('$U1','personal','ctm_1','$SUB','past_due','2026-11-16 00:00+00','2026-10-16 08:58:34+00','2026-10-16 08:58:34+00'),('$U2','solo','ctm_2','sub_OTHER','active',null,'2026-10-16 09:00+00','2026-10-16 09:00+00')"
run_mig $M >/dev/null; RC=$?
assert_eq "migration basarili" 0 "$RC"
assert_eq "hedef satir free/canceled" "free|canceled" "$(q "select plan||'|'||status from subscriptions where user_id='$U1'")"
assert_eq "paddle kimlikleri, last_event_at, period_end ayni" "ctm_1|$SUB|2026-10-16 08:58:34+00|2026-11-16 00:00:00+00" "$(P -d t -c "set timezone='UTC'" -c "select paddle_customer_id||'|'||paddle_subscription_id||'|'||last_event_at||'|'||current_period_end from subscriptions where user_id='$U1'" | tail -1)"
assert_eq "baska kullanici AYNI (solo/active/updated_at)" "solo|active|2026-10-16 09:00:00+00" "$(P -d t -c "set timezone='UTC'" -c "select plan||'|'||status||'|'||updated_at from subscriptions where user_id='$U2'" | tail -1)"
assert_eq "toplam satir sayisi degismedi (silme yok)" 2 "$(q "select count(*) from subscriptions")"
assert_eq "tam 1 denetim kaydi, eski degerler" "1|personal|past_due|free|canceled" "$(q "select count(*)||'|'||min(old_plan)||'|'||min(old_status)||'|'||min(new_plan)||'|'||min(new_status) from subscription_repairs")"
assert_eq "denetimde eski last_event_at saklandi" "2026-10-16 08:58:34+00" "$(P -d t -c "set timezone='UTC'" -c "select old_last_event_at from subscription_repairs" | tail -1)"

echo "0028-2 yeniden calistirma idempotent (denetim cogalmaz)"
run_mig $M >/dev/null
assert_eq "hala 1 denetim satiri" 1 "$(q "select count(*) from subscription_repairs")"

echo "0028-3 beklenen durumda degilse (active / baska plan) dokunmaz"
for st in "personal|active" "solo|past_due" "free|canceled"; do
  reset_db "${BASE[@]}"; ins "('$U1','${st%%|*}','c','$SUB','${st##*|}',null,now(),now())"
  run_mig $M >/dev/null
  assert_eq "dokunulmadi ($st)" "$st" "$(q "select plan||'|'||status from subscriptions where user_id='$U1'")"
  assert_eq "denetim yok ($st)" 0 "$(q "select count(*) from subscription_repairs")"
done

echo "0028-4 kayit yok (taze/prod disi DB): no-op, hata yok"
reset_db "${BASE[@]}"; run_mig $M >/dev/null; assert_eq "migration basarili" 0 "$?"
assert_eq "denetim yok" 0 "$(q "select count(*) from subscription_repairs")"

echo "0028-5 ayni abonelik 2 satirda: EXCEPTION + tam rollback (tablo bile olusmaz)"
reset_db "${BASE[@]}"; ins "('$U1','personal','c','$SUB','past_due',null,now(),now()),('$U2','personal','c','$SUB','past_due',null,now(),now())"
OUT=$(run_mig $M); RC=$?
assert_eq "migration HATA verdi" 1 "$([ $RC -ne 0 ] && echo 1 || echo 0)"
assert_eq "hata mesaji guvenlik durdurmasi" 1 "$(echo "$OUT" | grep -c 'birden fazla satırda')"
assert_eq "subscription_repairs olusmadi (rollback)" "f" "$(q "select to_regclass('public.subscription_repairs') is not null")"
assert_eq "iki satir da past_due kaldi" 2 "$(q "select count(*) from subscriptions where status='past_due'")"

echo "0028-6 RLS: denetim tablosunda politika yok, RLS acik"
reset_db "${BASE[@]}"; run_mig $M >/dev/null
assert_eq "RLS acik, politika sayisi 0" "t|0" "$(q "select relrowsecurity from pg_class where relname='subscription_repairs'")|$(q "select count(*) from pg_policies where tablename='subscription_repairs'")"
summary
