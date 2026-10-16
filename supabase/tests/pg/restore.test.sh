#!/usr/bin/env bash
# Yedekten geri yükleme DOĞRULAMASI testi (yedek.yml içindeki yapı sorguları BİREBİR kullanılır).
# 1) Tüm migration'lar boş DB'ye uygulanır (btree_gist gerekliliği kanıtlanır), 2) pg_dump -n public, 3) geri yükleme:
#    btree_gist YOKKEN yapı farkı/hata YAKALANMALI (negatif), btree_gist VARKEN fark OLMAMALI (pozitif).
source "$(dirname "$0")/lib.sh"
OPS="${OPS_YEDEK_YML:-/home/claude/planmoy-ops/.github/workflows/yedek.yml}"
[ -f "$OPS" ] || { echo "yedek.yml bulunamadi ($OPS); OPS_YEDEK_YML ile ver"; exit 2; }
pg_start
P -d postgres -c "create database t" >/dev/null
P -d t -c "create schema auth; create schema extensions; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql as 'select null::uuid';
  create extension if not exists btree_gist schema extensions; create extension if not exists pgcrypto schema extensions;
  create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid); alter table storage.objects enable row level security;
  create function storage.foldername(n text) returns text[] language sql as 'select string_to_array(n, ''/'')';" >/dev/null
P -d postgres -c "alter database t set search_path = public, extensions" >/dev/null
for m in $(ls "$MIGDIR"/*.sql | sort); do
  P -d t -1 -f "$m" >/dev/null 2>"$PGTMP/mig.err" || { echo "  migration hatasi ($(basename "$m")):"; cat "$PGTMP/mig.err"; exit 2; }
done
"${RUN[@]}" "$PGBIN/pg_dump" -h "$PGTMP" -p "$PORT" -U postgres -d t -Fc --no-owner --no-privileges -n public -f "$PGTMP/public.dump"
# Yapi sorgulari yedek.yml'den alinir
eval "$(grep -E '^ +q_(rls|pol|con|idx|trg|fn)=' "$OPS" | sed 's/^ *//')"

restore_into() { # veritabani adi, btree_gist (evet|hayir)
  P -d postgres -c "drop database if exists $1" -c "create database $1" >/dev/null
  P -d "$1" -c "create schema auth; create schema extensions; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as 'select null::uuid';" >/dev/null
  P -d "$1" -c "create extension pgcrypto schema extensions" >/dev/null
  [ "$2" = evet ] && P -d "$1" -c "create extension btree_gist schema extensions" >/dev/null
  P -d postgres -c "alter database $1 set search_path = public, extensions" >/dev/null
  "${RUN[@]}" "$PGBIN/pg_restore" -h "$PGTMP" -p "$PORT" -U postgres --no-owner --no-privileges -d "$1" "$PGTMP/public.dump" 2> "$PGTMP/restore-$1.err" || true
}
diffs() { # db -> fark sayisi (6 sorgu)
  local n=0 k qq
  for k in rls pol con idx trg fn; do
    eval "qq=\$q_$k"
    P -d t -c "$qq" > "$PGTMP/a.txt"; P -d "$1" -c "$qq" > "$PGTMP/b.txt" 2>/dev/null
    diff -q "$PGTMP/a.txt" "$PGTMP/b.txt" >/dev/null || n=$((n+1))
  done
  echo "$n"
}
echo "-- btree_gist OLMADAN geri yukleme (eski hata): dogrulama yakalamali --"
restore_into r1 hayir
E1=$(grep "error:" "$PGTMP/restore-r1.err" | grep -vc 'schema "public" already exists' || true)
D1=$(diffs r1)
if grep -q btree_gist "$MIGDIR"/*.sql; then
  assert_eq "negatif: btree_gist yokken hata VEYA yapi farki yakalandi" "evet" "$([ "$E1" -gt 0 ] || [ "$D1" -gt 0 ] && echo evet || echo hayir)"
else echo "  (migration'lar btree_gist kullanmiyor; negatif test atlandi)"; fi
echo "-- btree_gist ile geri yukleme: fark OLMAMALI --"
restore_into r2 evet
assert_eq "pozitif: restore hata sayisi" "0" "$(grep 'error:' "$PGTMP/restore-r2.err" | grep -vc 'schema "public" already exists' || true)"
assert_eq "pozitif: yapi farki (rls/policy/constraint/index/trigger/fonksiyon)" "0" "$(diffs r2)"
summary
