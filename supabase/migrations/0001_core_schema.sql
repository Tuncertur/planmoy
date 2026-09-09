-- Planmoy — Faz 1 çekirdek şema
-- FireVibe referans şemasından (Drizzle/Neon) Supabase Postgres + RLS'e uyarlanmıştır.
-- PROJECT_RULES.md kuralı: her tabloya RLS eklendiği AN satır VE sütun bazlı
-- kısıtlama birlikte düşünülür; hiçbir tablo demo/sabit veriyle bırakılmaz.

create extension if not exists "pgcrypto";

-- ============================================================
-- İşletme tarafı
-- ============================================================

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  industry text not null,
  city text not null,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  role text not null,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  duration_minutes integer not null,
  price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table availability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  slots jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  loyalty_points integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Randevu — hem kişisel hem işletme tarafını bağlar
-- ============================================================

create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  professional_id uuid not null references professionals(id),
  service_id uuid not null references services(id),
  customer_id uuid references customers(id),
  owner_id uuid references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('pending','confirmed','cancelled','completed','no_show')),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Gerçek çakışma/çift rezervasyon önleyici kısıt (FireVibe sürümünde hiç yoktu —
-- PROJECT_RULES: "eşzamanlı çift rezervasyonu engelleyen veritabanı kısıtı" maddesi)
create extension if not exists btree_gist;
alter table appointments
  add constraint no_overlapping_appointments
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending','confirmed'));

create table appointment_messages (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  surface text not null,
  action text not null,
  violation_count integer not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Kişisel taraf
-- ============================================================

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'kisisel',
  period text not null default 'today',
  priority text not null default 'medium',
  completed boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  color text not null,
  season text not null default 'tumu',
  image_key text,
  created_at timestamptz not null default now()
);

create table calendar_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table user_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'hobi',
  intensity text not null default 'meraklı',
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null default 'diger',
  description text,
  location text not null,
  starts_at timestamptz not null,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

create table event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  display_name text not null,
  status text not null default 'pending' check (status in ('pending','coming','not_coming')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — her tablo, oluşturulduğu anda
-- ============================================================

alter table businesses enable row level security;
alter table professionals enable row level security;
alter table services enable row level security;
alter table availability enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;
alter table appointment_messages enable row level security;
alter table moderation_events enable row level security;
alter table tasks enable row level security;
alter table wardrobe_items enable row level security;
alter table calendar_reminders enable row level security;
alter table user_interests enable row level security;
alter table events enable row level security;
alter table event_participants enable row level security;

-- İşletme sahibi kendi işletmesini tam yönetir
create policy "business owner full access" on businesses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- İşletmeye bağlı alt tablolar: sadece o işletmenin sahibi erişir
create policy "owner manages professionals" on professionals
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "owner manages services" on services
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "owner manages customers" on customers
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "owner manages availability" on availability
  for all using (professional_id in (
    select p.id from professionals p join businesses b on b.id = p.business_id
    where b.owner_id = auth.uid()
  ));

-- Randevular: hem işletme sahibi hem randevunun kişisel sahibi (müşteri) görebilir/yönetir
create policy "business owner manages appointments" on appointments
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "customer views own appointments" on appointments
  for select using (auth.uid() = owner_id);

-- Randevu mesajları: sadece randevunun tarafları (işletme sahibi veya müşteri) görür/yazar
create policy "appointment parties access messages" on appointment_messages
  for all using (
    appointment_id in (
      select a.id from appointments a
      where a.owner_id = auth.uid()
         or a.business_id in (select id from businesses where owner_id = auth.uid())
    )
  );

-- Kişisel tablolar: yalnızca sahibi
create policy "owner only" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner only" on wardrobe_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner only" on calendar_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner only" on user_interests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Moderasyon kayıtları: kullanıcı kendi ihlal geçmişini görebilir ama değiştiremez;
-- yazma yalnızca service_role (sunucu tarafı) ile yapılır
create policy "user reads own moderation history" on moderation_events
  for select using (auth.uid() = user_id);

-- Etkinlikler: sahibi tam yönetir, davetliler yalnızca share_token üzerinden
-- (uygulama katmanında, RLS burada sadece sahiplik erişimini kapsar)
create policy "owner manages events" on events
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "participant manages own rsvp" on event_participants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "organizer views participants" on event_participants
  for select using (
    event_id in (select id from events where owner_id = auth.uid())
  );
