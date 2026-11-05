#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
pg_start
reset_db 0019_user_usage_cost.sql
U1=11111111-1111-4111-8111-111111111111; U2=22222222-2222-4222-8222-222222222222
run_mig 0032_paid_api_guard.sql >/dev/null
run_mig 0033_usage_period.sql >/dev/null; assert_eq "0033 basarili" 0 "$?"
run_mig 0033_usage_period.sql >/dev/null; assert_eq "0033 idempotent" 0 "$?"
# R: kullanici ay yuzey tutar kullanici_tavani sayar sorgu_limiti proje_tavani idem donem
R() { local per="null"; [ -n "${10:-}" ] && per="'${10}'"; echo "reserve_paid_api('$1','$2','$3',$4,$5,$6,$7,$8,${9:-null},$per)"; }

echo "0033-1 donem anahtari verilmezse davranis 0032 ile ayni (ay anahtari)"
assert_eq "izin" t "$(q "select ($(R $U1 2026-10 ai 0.01 1 true 200 100)->>'allowed')::boolean")"
assert_eq "satir ay anahtariyla" 1 "$(q "select text_queries from user_usage_cost where user_id='$U1' and month='2026-10'")"

echo "0033-2 donem anahtari: sayac faturalama donemine gore tutulur, proje tavani takvim ayinda"
assert_eq "izin" t "$(q "select ($(R $U2 2026-10 ai 0.01 1 true 2 100 null b:2026-10-17)->>'allowed')::boolean")"
assert_eq "kullanici satiri donem anahtariyla" 1 "$(q "select text_queries from user_usage_cost where user_id='$U2' and month='b:2026-10-17'")"
assert_eq "ay anahtariyla satir yok" 0 "$(q "select count(*) from user_usage_cost where user_id='$U2' and month='2026-10'")"
assert_eq "proje takvim ayinda" 0.02 "$(q "select estimated_cost_usd::float8 from project_cost_month where month='2026-10'")"

echo "0033-3 takvim ayi degisse de ayni donemde sayac devam eder; yeni donemde sifirlanir"
assert_eq "ayni donem 2. izin (ay=11)" t "$(q "select ($(R $U2 2026-11 ai 0.01 1 true 2 100 null b:2026-10-17)->>'allowed')::boolean")"
assert_eq "ayni donem limit" monthly-query-limit-reached "$(q "select $(R $U2 2026-11 ai 0.01 1 true 2 100 null b:2026-10-17)->>'reason'")"
assert_eq "yeni donem izin" t "$(q "select ($(R $U2 2026-11 ai 0.01 1 true 2 100 null b:2026-11-17)->>'allowed')::boolean")"

echo "0033-4 mutabakat: iade donem satirina doner, proje takvim ayina"
ID=$(q "select $(R $U2 2026-12 ai 0.01 1 true 5 100 null b:2026-12-17)->>'ledger_id'")
assert_eq "defter donemi" b:2026-12-17 "$(q "select period from paid_api_ledger where id='$ID'")"
q "select settle_paid_api('$ID', 0, false)" >/dev/null
assert_eq "donem sayaci 0" 0 "$(q "select text_queries from user_usage_cost where user_id='$U2' and month='b:2026-12-17'")"
assert_eq "proje 2026-12 sifir" 0 "$(q "select estimated_cost_usd::float8 from project_cost_month where month='2026-12'")"

echo "0033-5 gecersiz donem (cok uzun) reddedilir; yetki"
assert_eq "uzun donem" invalid-request "$(q "select $(R $U1 2026-10 ai 0.01 1 true 5 100 null "$(printf 'x%.0s' $(seq 1 50))")->>'reason'")"
r=$(P -d t -c "set role authenticated; select $(R $U1 2026-10 ai 0.1 1 true 10 10)" >/dev/null 2>&1 && echo kabul || echo red); assert_eq "authenticated red" red "$r"
r=$(P -d t -c "set role service_role; select $(R $U1 2026-10 ai 0.1 1 true 10 10)" >/dev/null 2>&1 && echo kabul || echo red); assert_eq "service_role kabul" kabul "$r"
summary
