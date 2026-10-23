#!/usr/bin/env bash
# CI'daki geri yukleme ADIMININ (ops/scripts/geri-yukle.sh) yerel kaniti. Canliya ASLA baglanmaz.
# "Canli" taklidi: auth.users/identities + btree_gist PUBLIC semasinda (Supabase'deki gibi) + tum migration'lar.
# Pozitif: auth ONCE, public SONRA, eklenti canlidaki semada -> 0 hata, 0 yapi farki.
# Negatif: eski yontem (auth.users yok, eklenti baska semada) -> hata/fark YAKALANIR.
source "$(dirname "$0")/lib.sh"
SCRIPT="${OPS_GERI_YUKLE:-/home/claude/planmoy-ops/scripts/geri-yukle.sh}"
OPS="${OPS_YEDEK_YML:-/home/claude/planmoy-ops/.github/workflows/yedek.yml}"
[ -f "$SCRIPT" ] && [ -f "$OPS" ] || { echo "geri-yukle.sh/yedek.yml bulunamadi"; exit 2; }
export PATH="$PGBIN:$PATH"
pg_start
CI() { echo "host=$PGTMP port=$PORT user=postgres dbname=$1"; }
P -d postgres -c "create database live" >/dev/null
P -d live -c "create schema auth; create table auth.users(id uuid primary key, email text);
  create table auth.identities(id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade);
  create function auth.uid() returns uuid language sql as 'select null::uuid';
  create schema extensions; create extension pgcrypto schema extensions; create extension btree_gist schema public;
  create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid); alter table storage.objects enable row level security;
  create function storage.foldername(n text) returns text[] language sql as 'select string_to_array(n, ''/'')';
  insert into auth.users values ('11111111-1111-4111-8111-111111111111','a@example.test'),('22222222-2222-4222-8222-222222222222','b@example.test');
  insert into auth.identities values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111');" >/dev/null
P -d postgres -c "alter database live set search_path = public, extensions" >/dev/null
for m in $(ls "$MIGDIR"/*.sql | sort); do
  P -d live -1 -f "$m" >/dev/null 2>"$PGTMP/mig.err" || { echo "  migration hatasi ($(basename "$m")):"; cat "$PGTMP/mig.err"; exit 2; }
done
P -d live -c "insert into subscriptions(user_id, plan, status) values ('11111111-1111-4111-8111-111111111111','personal','active')" >/dev/null 2>&1 || true
W="$PGTMP/w"; mkdir -p "$W"; cd "$W" || exit 2
pg_dump "$(CI live)" -Fc --no-owner --no-privileges -n public -f public.dump
pg_dump "$(CI live)" -Fc --no-owner --no-privileges -t auth.users -t auth.identities -f auth.dump
eval "$(grep -E '^ +q_(rls|pol|con|idx|trg|fn)=' "$OPS" | sed 's/^ *//')"
diffs() { local n=0 k qq; for k in rls pol con idx trg fn; do eval "qq=\$q_$k"
  P -d live -c "$qq" > a.txt; P -d "$1" -c "$qq" > b.txt 2>/dev/null; diff -q a.txt b.txt >/dev/null || n=$((n+1)); done; echo "$n"; }
errs() { grep "error:" "$1" | grep -vc 'schema "public" already exists' || true; }

echo "-- pozitif: ops/scripts/geri-yukle.sh --"
P -d postgres -c "create database tgt" >/dev/null; P -d postgres -c "alter database tgt set search_path = public, extensions" >/dev/null
bash "$SCRIPT" "$(CI live)" "$(CI tgt)" public.dump auth.dump
assert_eq "restore hata sayisi (public)" "0" "$(errs restore-hatalar.txt)"
assert_eq "yapi farki (rls/policy/constraint/index/trigger/fonksiyon)" "0" "$(diffs tgt)"
assert_eq "kurulamayan onemli eklenti yok" "0" "$(wc -l < ext-eksik.txt | tr -d ' ')"
assert_eq "gercek auth dokumu yuklendi (taslak degil)" "hayir" "$(cat auth-stub.txt)"
assert_eq "satir sayisi auth.users" "$(P -d live -c 'select count(*) from auth.users')" "$(P -d tgt -c 'select count(*) from auth.users')"
assert_eq "satir sayisi subscriptions" "$(P -d live -c 'select count(*) from subscriptions')" "$(P -d tgt -c 'select count(*) from subscriptions')"

echo "-- negatif: eski yontem (auth.users yok + eklenti extensions semasinda) YAKALANMALI --"
P -d postgres -c "create database old" >/dev/null; P -d postgres -c "alter database old set search_path = public, extensions" >/dev/null
P -d old -c "create schema auth; create schema extensions; create extension btree_gist schema extensions; create extension pgcrypto schema extensions;
  create function auth.uid() returns uuid language sql as 'select null::uuid';" >/dev/null
pg_restore --no-owner --no-privileges -d "$(CI old)" public.dump 2> restore-old.txt || true
assert_eq "eski yontemde hata/fark yakalandi" "evet" "$([ "$(errs restore-old.txt)" -gt 0 ] || [ "$(diffs old)" -gt 0 ] && echo evet || echo hayir)"
summary
