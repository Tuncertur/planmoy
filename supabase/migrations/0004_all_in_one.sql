-- Planmoy — Tek parça şema (idempotent)
-- Bu dosyayı istediğin kadar çalıştırabilirsin, tekrar çalıştırmak hata vermez.
-- 0001, 0002, 0003 dosyalarının birleşimidir; onları silip bunu kullan.

create extension if not exists "pgcrypto";
create extension if not exists btree_gist;

-- ============================================================
-- İşletme tarafı
-- ============================================================

create table if not exists businesses (
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

create table if not exists professionals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  duration_minutes integer not null,
  price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  slots jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists customers (
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
-- Randevu
-- ============================================================

create table if not exists appointments (
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

do $$ begin
  alter table appointments
    add constraint no_overlapping_appointments
    exclude using gist (
      professional_id with =,
      tstzrange(starts_at, ends_at) with &&
    ) where (status in ('pending','confirmed'));
exception when duplicate_object then null;
end $$;

create table if not exists appointment_messages (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists moderation_events (
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

create table if not exists tasks (
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

create table if not exists wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  color text not null,
  season text not null default 'tumu',
  image_key text,
  created_at timestamptz not null default now()
);

create table if not exists calendar_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists user_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'hobi',
  intensity text not null default 'meraklı',
  created_at timestamptz not null default now()
);

create table if not exists events (
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

create table if not exists event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  display_name text not null,
  status text not null default 'pending' check (status in ('pending','coming','not_coming')),
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  tag text not null default '#fikir',
  tone text not null default 'sky' check (tone in ('sky','sun','mint','rose')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
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
alter table notes enable row level security;

drop policy if exists "business owner full access" on businesses;
create policy "business owner full access" on businesses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owner manages professionals" on professionals;
create policy "owner manages professionals" on professionals
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));

drop policy if exists "owner manages services" on services;
create policy "owner manages services" on services
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));

drop policy if exists "owner manages customers" on customers;
create policy "owner manages customers" on customers
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));

drop policy if exists "owner manages availability" on availability;
create policy "owner manages availability" on availability
  for all using (professional_id in (
    select p.id from professionals p join businesses b on b.id = p.business_id
    where b.owner_id = auth.uid()
  ));

drop policy if exists "business owner manages appointments" on appointments;
create policy "business owner manages appointments" on appointments
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));

drop policy if exists "customer views own appointments" on appointments;
create policy "customer views own appointments" on appointments
  for select using (auth.uid() = owner_id);

drop policy if exists "appointment parties access messages" on appointment_messages;
create policy "appointment parties access messages" on appointment_messages
  for all using (
    appointment_id in (
      select a.id from appointments a
      where a.owner_id = auth.uid()
         or a.business_id in (select id from businesses where owner_id = auth.uid())
    )
  );

drop policy if exists "owner only" on tasks;
create policy "owner only" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner only" on wardrobe_items;
create policy "owner only" on wardrobe_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner only" on calendar_reminders;
create policy "owner only" on calendar_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner only" on user_interests;
create policy "owner only" on user_interests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner only" on notes;
create policy "owner only" on notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user reads own moderation history" on moderation_events;
create policy "user reads own moderation history" on moderation_events
  for select using (auth.uid() = user_id);

drop policy if exists "owner manages events" on events;
create policy "owner manages events" on events
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "participant manages own rsvp" on event_participants;
create policy "participant manages own rsvp" on event_participants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "organizer views participants" on event_participants;
create policy "organizer views participants" on event_participants
  for select using (
    event_id in (select id from events where owner_id = auth.uid())
  );

-- ============================================================
-- Rate limiting
-- ============================================================

create or replace function enforce_task_rate_limit()
returns trigger as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from tasks
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';

  if recent_count >= 200 then
    raise exception 'Saatlik görev ekleme limitine ulaşıldı, lütfen daha sonra tekrar deneyin.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tasks_rate_limit on tasks;
create trigger tasks_rate_limit
  before insert on tasks
  for each row execute function enforce_task_rate_limit();

create or replace function enforce_event_rate_limit()
returns trigger as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from events
  where owner_id = new.owner_id
    and created_at > now() - interval '1 hour';

  if recent_count >= 50 then
    raise exception 'Saatlik etkinlik oluşturma limitine ulaşıldı.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists events_rate_limit on events;
create trigger events_rate_limit
  before insert on events
  for each row execute function enforce_event_rate_limit();
