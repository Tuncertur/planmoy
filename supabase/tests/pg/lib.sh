#!/usr/bin/env bash
# Atılabilir YEREL PostgreSQL ile migration testleri. Canlı veritabanına ASLA bağlanmaz.
# Kullanım: bash supabase/tests/pg/run-all.sh   (PostgreSQL sunucu ikilileri gerekir: pg_ctl, initdb)
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MIGDIR="$ROOT/supabase/migrations"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
PGTMP="$(mktemp -d /tmp/planmoy-pgtest.XXXXXX)"
PORT=$((54000 + RANDOM % 900))
if [ "$(id -u)" = 0 ]; then RUN=(runuser -u postgres --); chown postgres:postgres "$PGTMP"; else RUN=(); fi
PASS=0; FAIL=0

pg_start() {
  "${RUN[@]}" "$PGBIN/initdb" -D "$PGTMP/data" -U postgres -A trust >/dev/null || { echo "initdb basarisiz"; exit 2; }
  "${RUN[@]}" "$PGBIN/pg_ctl" -D "$PGTMP/data" -o "-p $PORT -k $PGTMP -c listen_addresses=''" -l "$PGTMP/log" -w start >/dev/null || { echo "pg_ctl basarisiz"; exit 2; }
  # Roller küme geneldir: bir kez oluştur (Supabase rolleri taslağı)
  P -d postgres -c "do \$\$ begin create role authenticated; create role anon; create role service_role; end \$\$;"
}
pg_stop() { "${RUN[@]}" "$PGBIN/pg_ctl" -D "$PGTMP/data" -m immediate stop >/dev/null 2>&1; rm -rf "$PGTMP"; }
trap pg_stop EXIT

P() { psql -h "$PGTMP" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -At "$@"; }

# Temiz veritabanı: auth.users taslağı + GERÇEK migration dosyaları (verilen sırayla)
reset_db() {
  P -d postgres -c "drop database if exists t" -c "create database t" >/dev/null
  P -d t -c "create schema auth; create table auth.users(id uuid primary key);
             create function auth.uid() returns uuid language sql as 'select null::uuid';
             insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');"
  for m in "$@"; do P -d t -1 -f "$MIGDIR/$m" >/dev/null 2>"$PGTMP/mig.err" || { echo "  taban migration hatasi ($m):"; cat "$PGTMP/mig.err"; exit 2; }; done
}
# Hedef migration'ı tek transaction'da çalıştırır; çıktı + çıkış kodu döner
run_mig() { P -d t -1 -f "$MIGDIR/$1" 2>&1; }

assert_eq() { # ad beklenen gercek
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  PASS  $1"; else FAIL=$((FAIL+1)); echo "  FAIL  $1  (beklenen='$2' gercek='$3')"; fi
}
q() { P -d t -c "$1"; }
summary() { echo "== $PASS gecti, $FAIL kaldi =="; [ "$FAIL" = 0 ]; }
