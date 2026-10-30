#!/usr/bin/env bash
source "$(dirname "$0")/lib.sh"
pg_start
M=0032_paid_api_guard.sql
reset_db 0019_user_usage_cost.sql
U1=11111111-1111-4111-8111-111111111111; U2=22222222-2222-4222-8222-222222222222; U3=33333333-3333-4333-8333-333333333333
R() { # kullanici ay yuzey tutar kullanici_tavani sayar sorgu_limiti proje_tavani idem
  echo "reserve_paid_api('$1','$2','$3',$4,$5,$6,$7,$8,${9:-null})"; }
echo "0032-1 migration idempotent"
run_mig $M >/dev/null; assert_eq "migration basarili" 0 "$?"
run_mig $M >/dev/null; assert_eq "ikinci calistirma basarili" 0 "$?"

echo "0032-2 Free (tavan 0): ucretli API reddedilir, sayac/defter degismez"
assert_eq "free reddi" plan-has-no-paid-api "$(q "select $(R $U1 2026-10 ai 0.0012 0 true 0 1000)->>'reason'")"
assert_eq "defter bos" 0 "$(q "select count(*) from paid_api_ledger")"
assert_eq "kullanici satiri yok" 0 "$(q "select count(*) from user_usage_cost")"

echo "0032-3 aylik sorgu haklari: Personal 200 / Solo 500 / Studio 1000 tam burada durur"
for spec in "$U1 200" "$U2 500" "$U3 1000"; do set -- $spec
  ok=$(q "select count(*) filter (where (r->>'allowed')::boolean) from (select $(R $1 2026-10 ai 0.0001 100 true $2 1000) as r from generate_series(1,$2+5)) s")
  assert_eq "limit $2: izin verilen" "$2" "$ok"
  assert_eq "limit $2: son red nedeni" monthly-query-limit-reached "$(q "select $(R $1 2026-10 ai 0.0001 100 true $2 1000)->>'reason'")"
  assert_eq "limit $2: sayac" "$2" "$(q "select text_queries from user_usage_cost where user_id='$1' and month='2026-10'")"
done

echo "0032-4 aylik sayac yeni ayda sifirlanir (ay anahtari)"
assert_eq "yeni ay izin" t "$(q "select ($(R $U1 2026-11 ai 0.0001 100 true 200 1000)->>'allowed')::boolean")"
assert_eq "yeni ay sayac 1" 1 "$(q "select text_queries from user_usage_cost where user_id='$U1' and month='2026-11'")"

echo "0032-5 dolar tavani"
reset_db 0019_user_usage_cost.sql; run_mig $M >/dev/null
n=$(q "select count(*) filter (where (r->>'allowed')::boolean) from (select $(R $U1 2026-10 places 0.1 0.39 false 0 1000) as r from generate_series(1,6)) s")
assert_eq "0.39 tavanda 0.1'lik 3 islem" 3 "$n"
assert_eq "red nedeni" monthly-cost-cap-reached "$(q "select $(R $U1 2026-10 places 0.1 0.39 false 0 1000)->>'reason'")"

echo "0032-6 ESZAMANLI 20 istek tavani asamaz (tavan 1.0, istek 0.1 => en fazla 10)"
reset_db 0019_user_usage_cost.sql; run_mig $M >/dev/null
for i in $(seq 1 20); do ( P -d t -c "select ($(R $U2 2026-10 ai 0.1 1.0 true 1000 1000)->>'allowed')" >> "$PGTMP/conc.out" ) & done; wait
assert_eq "izinli sayisi tam 10" 10 "$(grep -c '^true$' "$PGTMP/conc.out")"
assert_eq "harcama 1.0'i asmaz" t "$(q "select estimated_cost_usd <= 1.0 and estimated_cost_usd = 1.0 from user_usage_cost where user_id='$U2'")"
assert_eq "sorgu sayaci 10" 10 "$(q "select text_queries from user_usage_cost where user_id='$U2'")"

echo "0032-7 idempotency: ayni anahtar cift ucretlenmez; iade sonrasi yeniden izin"
reset_db 0019_user_usage_cost.sql; run_mig $M >/dev/null
L=$(q "select $(R $U1 2026-10 ai 0.01 1 true 200 100 "'k1'")->>'ledger_id'")
assert_eq "ilk istek rezerve" 0.01 "$(q "select estimated_cost_usd::float8 from user_usage_cost where user_id='$U1'")"
assert_eq "tekrar: duplicate" duplicate-request "$(q "select $(R $U1 2026-10 ai 0.01 1 true 200 100 "'k1'")->>'reason'")"
assert_eq "tekrar: maliyet degismedi" 0.01 "$(q "select estimated_cost_usd::float8 from user_usage_cost where user_id='$U1'")"
assert_eq "tekrar: sayac degismedi" 1 "$(q "select text_queries from user_usage_cost where user_id='$U1'")"
assert_eq "baska kullanici ayni anahtar serbest" t "$(q "select ($(R $U2 2026-10 ai 0.01 1 true 200 100 "'k1'")->>'allowed')::boolean")"
assert_eq "saglayici hatasi: iade" t "$(q "select settle_paid_api('$L', 0, false)")"
assert_eq "iade sonrasi maliyet 0" 0 "$(q "select estimated_cost_usd::float8 from user_usage_cost where user_id='$U1'")"
assert_eq "iade sonrasi sayac 0" 0 "$(q "select text_queries from user_usage_cost where user_id='$U1'")"
assert_eq "ikinci iade etkisiz" f "$(q "select settle_paid_api('$L', 0, false)")"
assert_eq "iade sonrasi ayni anahtar yeniden izin" t "$(q "select ($(R $U1 2026-10 ai 0.01 1 true 200 100 "'k1'")->>'allowed')::boolean")"
assert_eq "yeniden rezerve: tek satir" 1 "$(q "select count(*) from paid_api_ledger where user_id='$U1' and idem_key='k1'")"

echo "0032-8 rezervasyon ile gerceklesen mutabakat"
reset_db 0019_user_usage_cost.sql; run_mig $M >/dev/null
A=$(q "select $(R $U1 2026-10 ai 0.01 1 true 200 100)->>'ledger_id'")
B=$(q "select $(R $U1 2026-10 ai 0.01 1 true 200 100)->>'ledger_id'")
Cc=$(q "select $(R $U1 2026-10 ai 0.01 1 true 200 100)->>'ledger_id'")
q "select settle_paid_api('$A', 0.004, true)" >/dev/null     # gercek rezervden dusuk
q "select settle_paid_api('$B', 0.02, true)" >/dev/null      # gercek rezervden yuksek (asim kaydedilir)
q "select settle_paid_api('$Cc', 0, false)" >/dev/null       # saglayici hatasi
assert_eq "kullanici maliyeti = 0.004+0.02" 0.024 "$(q "select estimated_cost_usd::float8 from user_usage_cost where user_id='$U1'")"
assert_eq "defter toplami (iade haric) ayni" 0.024 "$(q "select coalesce(sum(coalesce(actual_usd,reserved_usd)) filter (where status<>'refunded'),0)::float8 from paid_api_ledger")"
assert_eq "proje toplami ayni" 0.024 "$(q "select estimated_cost_usd::float8 from project_cost_month where month='2026-10'")"
assert_eq "sorgu sayaci 2 (biri iade)" 2 "$(q "select text_queries from user_usage_cost where user_id='$U1'")"
assert_eq "ayni kayit ikinci mutabakat etkisiz" f "$(q "select settle_paid_api('$A', 9, true)")"

echo "0032-9 proje geneli tavan"
reset_db 0019_user_usage_cost.sql; run_mig $M >/dev/null
assert_eq "u1 izin" t "$(q "select ($(R $U1 2026-10 ai 0.1 5 false 0 0.25)->>'allowed')::boolean")"
assert_eq "u2 izin" t "$(q "select ($(R $U2 2026-10 ai 0.1 5 false 0 0.25)->>'allowed')::boolean")"
assert_eq "u3 proje tavani" project-cap-reached "$(q "select $(R $U3 2026-10 ai 0.1 5 false 0 0.25)->>'reason'")"
assert_eq "red kullanici sayacini degistirmedi" 0 "$(q "select count(*) from user_usage_cost where user_id='$U3' and estimated_cost_usd>0")"
assert_eq "proje toplami 0.2" 0.2 "$(q "select estimated_cost_usd::float8 from project_cost_month where month='2026-10'")"

echo "0032-10 gecersiz girdi (maliyet bilgisi yok/negatif) guvenli reddedilir"
assert_eq "negatif tutar" invalid-request "$(q "select $(R $U1 2026-10 ai -1 1 true 10 10)->>'reason'")"
assert_eq "tutar null" invalid-request "$(q "select reserve_paid_api('$U1','2026-10','ai',null,1,true,10,10,null)->>'reason'")"
assert_eq "proje tavani null" invalid-request "$(q "select reserve_paid_api('$U1','2026-10','ai',0.1,1,true,10,null,null)->>'reason'")"

echo "0032-11 yetki"
r=$(P -d t -c "set role authenticated; select $(R $U1 2026-10 ai 0.1 1 true 10 10)" >/dev/null 2>&1 && echo kabul || echo red); assert_eq "authenticated red" red "$r"
r=$(P -d t -c "set role anon; select paid_api_top_spenders('2026-10')" >/dev/null 2>&1 && echo kabul || echo red); assert_eq "anon rapor red" red "$r"
r=$(P -d t -c "set role service_role; select $(R $U1 2026-10 ai 0.1 1 true 10 10)" >/dev/null 2>&1 && echo kabul || echo red); assert_eq "service_role kabul" kabul "$r"
summary
