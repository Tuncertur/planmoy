#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
pg_start
M=0030_account_deletion_log.sql
reset_db 0012_subscriptions.sql
echo "0030-1 tablo olusur, RLS acik, politika yok, idempotent"
run_mig $M >/dev/null; assert_eq "migration basarili" 0 "$?"
run_mig $M >/dev/null; assert_eq "ikinci calistirma basarili" 0 "$?"
assert_eq "RLS acik, politika 0" "t|0" "$(q "select relrowsecurity from pg_class where relname='account_deletion_log'")|$(q "select count(*) from pg_policies where tablename='account_deletion_log'")"
rej(){ if q "$1" >/dev/null 2>&1; then echo "kabul"; else echo "red"; fi; }
assert_eq "gecersiz outcome reddedilir" red "$(rej "insert into account_deletion_log(user_hash,subscription_canceled,outcome) values ('h',true,'baska')")"
assert_eq "gecerli kayit kabul" kabul "$(rej "insert into account_deletion_log(user_hash,subscription_canceled,outcome) values ('h',true,'deleted')")"
assert_eq "kullanici silinse de kayit kalir (FK yok)" 1 "$(q "select count(*) from account_deletion_log")"
summary
