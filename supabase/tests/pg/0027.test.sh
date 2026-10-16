#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
pg_start
U1=11111111-1111-4111-8111-111111111111
M=0027_checkout_locks.sql
reset_db 0012_subscriptions.sql
echo "0027-1 tablo, RLS, kisitlar"
run_mig $M >/dev/null; assert_eq "migration basarili" 0 "$?"
run_mig $M >/dev/null; assert_eq "idempotent" 0 "$?"
assert_eq "RLS acik, politika 0" "t|0" "$(q "select relrowsecurity from pg_class where relname='checkout_locks'")|$(q "select count(*) from pg_policies where tablename='checkout_locks'")"
rej(){ if q "$1" >/dev/null 2>&1; then echo "kabul"; else echo "red"; fi; }
assert_eq "ilk kilit kabul" kabul "$(rej "insert into checkout_locks(user_id,plan,expires_at) values ('$U1','solo',now()+interval '1 min')")"
assert_eq "ikinci eszamanli kilit unique ihlaliyle reddedilir" 1 "$(P -d t -c "insert into checkout_locks(user_id,plan,expires_at) values ('$U1','solo',now())" 2>&1 | grep -c 'checkout_locks_pkey')"
assert_eq "gecersiz plan reddedilir" red "$(rej "insert into checkout_locks(user_id,plan,expires_at) values ('$U1','free',now())")"
q "delete from checkout_locks" >/dev/null
q "insert into checkout_locks(user_id,plan,expires_at) values ('$U1','solo',now())" >/dev/null
q "delete from auth.users where id='$U1'" >/dev/null
assert_eq "kullanici silinince kilit gider (cascade)" 0 "$(q "select count(*) from checkout_locks")"
summary
