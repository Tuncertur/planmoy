#!/usr/bin/env bash
# Planmoy — SALDIRI TESTİ (kırmızı takım). Yerel atılabilir PG; TÜM migration'lar uygulanır, ardından anon/başka kullanıcı olarak
# veri okuma/yazma/yetki yükseltme denenir. Her "saldırı" BAŞARISIZ olmalıdır. Canlı veritabanına bağlanmaz.
source "$(dirname "$0")/lib.sh"
pg_start
P -d postgres -c "drop database if exists t" -c "create database t" >/dev/null
P -d t -c "create extension if not exists pgcrypto; create schema auth; create table auth.users(id uuid primary key, email text);
 create function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid \$\$;
 create schema storage; create table storage.buckets(id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid); alter table storage.objects enable row level security;
 create function storage.foldername(n text) returns text[] language sql as \$\$ select string_to_array(n,'/') \$\$;
 grant usage on schema auth, storage to anon, authenticated, service_role;" >/dev/null
U1=11111111-1111-4111-8111-111111111111; U2=22222222-2222-4222-8222-222222222222
P -d t -c "insert into auth.users(id,email) values ('$U1','a@x'),('$U2','b@x')" >/dev/null
for m in $(ls "$MIGDIR"/*.sql | sort); do P -d t -f "$m" >/dev/null 2>"$PGTMP/e" || { echo "migration hatasi $m"; head -3 "$PGTMP/e"; exit 2; }; done
# Supabase varsayılan yetkileri: RLS tek bariyer olsun
P -d t -c "grant all on all tables in schema public to anon, authenticated; grant all on all tables in schema storage to anon, authenticated;" >/dev/null
# Tohum (U2 = kurban)
P -d t >/dev/null <<SQL
insert into businesses(id,owner_id,name,slug,industry,city,phone,address) values ('b2000000-0000-4000-8000-000000000002','$U2','Kurban Salon','kurban','x','c','5551112233','Gizli Adres 1');
insert into businesses(id,owner_id,name,slug,industry,city) values ('b1000000-0000-4000-8000-000000000001','$U1','Saldirgan','sald','x','c');
insert into professionals(id,business_id,name,role) values ('c2000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','P','r'),('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','P1','r');
insert into services(id,business_id,name,duration_minutes,price) values ('d2000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','S',30,10),('d1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','S1',30,10);
insert into appointments(id,business_id,professional_id,service_id,owner_id,customer_name,customer_email,starts_at,ends_at) values ('a2000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','$U2','Musteri','m@x',now()+interval '1 day',now()+interval '1 day 1 hour');
insert into customers(business_id,name,email,notes) values ('b2000000-0000-4000-8000-000000000002','Gizli Musteri','g@x','ozel not');
insert into notes(user_id,title,body) values ('$U2','gizli','gizli govde');
insert into tasks(user_id,title) values ('$U2','gizli gorev');
insert into subscriptions(user_id,plan,status) values ('$U2','studio','active'),('$U1','free','active');
insert into public_profiles(user_id,nickname,age,gender,active) values ('$U2','kurban',30,'kadin',true);
insert into events(id,owner_id,title,location,starts_at) values ('e2000000-0000-4000-8000-000000000002','$U2','E','L',now()+interval '2 day');
insert into notifications(user_id,title) values ('$U2','gizli bildirim');
insert into appointment_messages(id,appointment_id,author_id,body) values ('f1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','$U2','kurban mesaji');
SQL
A() { # kim("anon"|uuid) sql -> komut etiketi/çıktı (SET satırları ayıklanır) | ERR
  local who="$1" sql="$2" pre
  [ -n "${DEBUG:-}" ] && echo "SQL[$who]: ${sql:0:90}" >&2
  if [ "$who" = anon ]; then pre="set role anon;"; else pre="set role authenticated; set request.jwt.claim.sub='$who';"; fi
  out=$(psql -h "$PGTMP" -p "$PORT" -U postgres -d t -v ON_ERROR_STOP=1 -At -c "$pre $sql" 2>&1) || { [ -n "${DEBUG:-}" ] && echo "ERRMSG: $out" >&2; echo ERR; return; }
  echo "$out" | grep -v '^SET$' | tr '\n' ';' | sed 's/;$//'
}
isblocked() { # ad sonuç  (ERR ya da 0/boş = engellendi)
  case "$2" in ERR|0|"UPDATE 0"|"DELETE 0") PASS=$((PASS+1)); echo "  PASS  $1";; *) FAIL=$((FAIL+1)); echo "  FAIL  $1  (saldiri basarili: '$2')";; esac
}

echo "S0 pozitif kontroller (test geçerli mi: meşru işlemler ÇALIŞMALI)"
ok() { if [ "$2" != ERR ] && [ -n "$2" ] && [ "$2" != 0 ] && [ "$2" != "UPDATE 0" ]; then PASS=$((PASS+1)); echo "  PASS  $1"; else FAIL=$((FAIL+1)); echo "  FAIL  $1 (calismadi: $2)"; fi; }
okw() { if [ "$2" = "INSERT 0 1" ] || [[ "$2" == UPDATE\ [1-9]* ]]; then PASS=$((PASS+1)); echo "  PASS  $1"; else FAIL=$((FAIL+1)); echo "  FAIL  $1 (hata)"; fi; }
ok "tohum: kurban kendi notunu okur" "$(A $U2 "select title from notes where user_id='$U2'")"
ok "tohum: kurban kendi aboneligini okur" "$(A $U2 "select plan from subscriptions where user_id='$U2'")"
ok "tohum: kurban kendi bildirimini okur" "$(A $U2 "select title from notifications where user_id='$U2'")"
ok "tohum: kurban kendi mesajini okur" "$(A $U2 "select body from appointment_messages where id='f1000000-0000-4000-8000-000000000001'")"
ok "tohum: kurban kendi etkinligini okur" "$(A $U2 "select title from events where owner_id='$U2'")"
ok "tohum: kurban kendi profilini okur" "$(A $U2 "select nickname from public_profiles where user_id='$U2'")"
okw "mesru: kullanici kendi notunu yazar" "$(A $U1 "insert into notes(user_id,title,body) values ('$U1','a','b')")"
okw "mesru: anon tek bekleyen randevu ekler" "$(A anon "insert into appointments(business_id,professional_id,service_id,customer_name,customer_email,starts_at,ends_at,status) values ('b2000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','Misafir','g@x',now()+interval '2 day',now()+interval '2 day 1 hour','pending')")"
echo "S1 anonim okuma"
for t in businesses professionals services appointments customers notes tasks subscriptions public_profiles events notifications appointment_messages event_participants user_usage_cost ai_usage_log medications emergency_contacts wardrobe_items user_interests user_preferences calendar_reminders moderation_events paid_api_ledger project_cost_month processed_webhook_events checkout_locks account_deletion_log cost_exempt_users subscription_repairs free_pool_cost; do
  isblocked "anon $t okuyamaz" "$(A anon "select count(*) from $t")"
done
echo "S2 başka kullanıcı (U1) kurbanın (U2) verisini okuyamaz"
for t in notes tasks subscriptions public_profiles notifications customers appointments appointment_messages; do
  r=$(A $U1 "select count(*) from $t where $( [ $t = customers ] && echo "business_id='b2000000-0000-4000-8000-000000000002'" || ([ $t = appointments ] && echo "id='a2000000-0000-4000-8000-000000000002'") || ([ $t = appointment_messages ] && echo "id='f1000000-0000-4000-8000-000000000001'") || echo "user_id='$U2'")"); isblocked "U1, U2'nin $t verisini okuyamaz" "$r"
done
isblocked "U1 kurban isletmesini okuyamaz" "$(A $U1 "select count(*) from businesses where owner_id='$U2'")"
echo "S3 yetki yükseltme / sahtecilik"
isblocked "U1 kendi aboneligini studio yapamaz (UPDATE)" "$(A $U1 "update subscriptions set plan='studio', status='active' where user_id='$U1'")"
isblocked "U1 abonelik satiri ekleyemez (INSERT)" "$(A $U1 "insert into subscriptions(user_id,plan,status) values ('$U1','studio','active') on conflict (user_id) do update set plan='studio'")"
isblocked "U1 kurbanin aboneligini silemez" "$(A $U1 "delete from subscriptions where user_id='$U2'")"
isblocked "U1 kurban adina not yazamaz" "$(A $U1 "insert into notes(user_id,title,body) values ('$U2','x','y')")"
isblocked "U1 kurbanin notunu degistiremez" "$(A $U1 "update notes set title='ele gecirildi' where user_id='$U2'")"
isblocked "U1 kurbanin gorevini silemez" "$(A $U1 "delete from tasks where user_id='$U2'")"
isblocked "U1 kurbana bildirim yollayamaz" "$(A $U1 "insert into notifications(user_id,title) values ('$U2','phishing')")"
isblocked "U1 kurbanin isletmesini degistiremez" "$(A $U1 "update businesses set name='hack' where owner_id='$U2'")"
isblocked "U1 kurbanin musterisini silemez" "$(A $U1 "delete from customers where business_id='b2000000-0000-4000-8000-000000000002'")"
isblocked "U1 kurbanin randevusunu iptal edemez" "$(A $U1 "update appointments set status='cancelled' where id='a2000000-0000-4000-8000-000000000002'")"
isblocked "U1 kurbanin isletmesine musteri ekleyemez" "$(A $U1 "insert into customers(business_id,name) values ('b2000000-0000-4000-8000-000000000002','spam')")"
isblocked "U1 kurbanin isletmesine hizmet ekleyemez" "$(A $U1 "insert into services(business_id,name,duration_minutes,price) values ('b2000000-0000-4000-8000-000000000002','x',1,1)")"
isblocked "U1 kurbanin mesajini degistiremez" "$(A $U1 "update appointment_messages set body='sahte' where id='f1000000-0000-4000-8000-000000000001'")"
isblocked "U1 kurbanin randevu konusmasina mesaj yazamaz" "$(A $U1 "insert into appointment_messages(appointment_id,author_id,body) values ('a2000000-0000-4000-8000-000000000002','$U1','sizma')")"
isblocked "U1 baska kullanici adina mesaj yazamaz" "$(A $U1 "insert into appointment_messages(appointment_id,author_id,body) values ('a2000000-0000-4000-8000-000000000002','$U2','sahte')")"
isblocked "anon onaylanmis randevu ekleyemez" "$(A anon "insert into appointments(business_id,professional_id,service_id,customer_name,customer_email,starts_at,ends_at,status) values ('b2000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','x','x@x',now()+interval '3 day',now()+interval '3 day 1 hour','confirmed')")"
isblocked "anon baskasi adina (owner_id) randevu ekleyemez" "$(A anon "insert into appointments(business_id,professional_id,service_id,owner_id,customer_name,customer_email,starts_at,ends_at) values ('b2000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','$U2','x','x@x',now()+interval '3 day',now()+interval '3 day 1 hour')")"
P -d t >/dev/null <<SQL
insert into appointments(id,business_id,professional_id,service_id,owner_id,customer_name,customer_email,starts_at,ends_at) values ('a1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','$U1','S','s@x',now()+interval '1 day',now()+interval '1 day 1 hour');
insert into appointment_messages(id,appointment_id,author_id,body) values ('f2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001','$U1','kendi mesajim');
SQL
ok "tohum: U1 kendi mesajini gorur" "$(A $U1 "select body from appointment_messages where id='f2000000-0000-4000-8000-000000000002'")"
ok "tohum: U1 kendi randevusunu gorur" "$(A $U1 "select customer_name from appointments where id='a1000000-0000-4000-8000-000000000001'")"
isblocked "U1 kendi mesajini kurbanin konusmasina TASIYAMAZ (UPDATE appointment_id)" "$(A $U1 "update appointment_messages set appointment_id='a2000000-0000-4000-8000-000000000002' where id='f2000000-0000-4000-8000-000000000002'")"
isblocked "U1 kendi randevusunu kurbana ATAYAMAZ (owner_id degistirme)" "$(A $U1 "update appointments set owner_id='$U2' where id='a1000000-0000-4000-8000-000000000001'")"
isblocked "isletme sahibi kurban adina randevu EKLEYEMEZ (owner_id=kurban)" "$(A $U1 "insert into appointments(business_id,professional_id,service_id,owner_id,customer_name,customer_email,starts_at,ends_at,status) values ('b1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','$U2','sahte','p@x',now()+interval '9 day',now()+interval '9 day 1 hour','pending')")"
okw "isletme sahibi kendi randevusunun durumunu degistirebilir (mesru)" "$(A $U1 "update appointments set status='confirmed' where id='a1000000-0000-4000-8000-000000000001'")"
isblocked "U1 randevusunu baska isletmeye TASIYAMAZ (business_id)" "$(A $U1 "update appointments set business_id='b2000000-0000-4000-8000-000000000002' where id='a1000000-0000-4000-8000-000000000001'")"
echo "S4 depolama (gardırop fotoğrafları)"
P -d t -c "insert into storage.objects(bucket_id,name,owner) values ('wardrobe','$U2/foto.jpg','$U2')" >/dev/null
isblocked "U1 kurbanin fotografini okuyamaz" "$(A $U1 "select count(*) from storage.objects where name like '$U2/%'")"
isblocked "U1 kurbanin klasorune yukleyemez" "$(A $U1 "insert into storage.objects(bucket_id,name,owner) values ('wardrobe','$U2/zararli.jpg','$U1')")"
isblocked "U1 kurbanin fotografini silemez" "$(A $U1 "delete from storage.objects where name like '$U2/%'")"
isblocked "anon fotograf okuyamaz" "$(A anon "select count(*) from storage.objects")"
echo "S5 SECURITY DEFINER fonksiyonlarını istemciden çağırma"
isblocked "U1 reserve_paid_api calistiramaz" "$(A $U1 "select reserve_paid_api('$U2','2026-11','ai',0.01,1,1,true,10,10,null)" )"
isblocked "U1 kurban adina maliyet yazamaz (charge_user_cost)" "$(A $U1 "select charge_user_cost('$U2','2026-11',100,100)")"
isblocked "U1 kurban adina ai kaydi yazamaz" "$(A $U1 "select check_and_log_ai_usage('$U2','x',1)")"
isblocked "anon webhook olayi talep edemez (DoS)" "$(A anon "select claim_webhook_event('evt_1','x',60)")"
isblocked "U1 en cok harcayanlari goremez" "$(A $U1 "select paid_api_top_spenders('2026-11',5)")"
echo "S6 kötüye kullanım: hız sınırı"
for i in $(seq 1 40); do
  P -d t -c "set role anon; insert into appointments(business_id,professional_id,service_id,customer_name,customer_email,starts_at,ends_at,status) values ('b2000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000002','spam$i','s@x',now()+interval '$((i+5)) day',now()+interval '$((i+5)) day 1 hour','pending')" >/dev/null 2>&1
done
r=$(q "select count(*) from appointments where customer_name like 'spam%'")
if [ "$r" -gt 0 ] && [ "$r" -lt 40 ]; then PASS=$((PASS+1)); echo "  PASS  anon toplu randevu spami sinirlandi ($r/40 kabul)"; else FAIL=$((FAIL+1)); echo "  FAIL  anon 40 sahte randevu ekleyebildi (hiz siniri yok)"; fi
summary
