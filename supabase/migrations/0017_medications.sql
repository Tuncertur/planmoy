create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dosage text,
  times text[] not null default '{}',
  days_of_week int[] not null default '{0,1,2,3,4,5,6}',
  start_date date not null default current_date,
  end_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table medications enable row level security;
drop policy if exists "owner manages own medications" on medications;
create policy "owner manages own medications" on medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null check (status in ('taken', 'missed', 'skipped')),
  logged_at timestamptz not null default now()
);

alter table medication_logs enable row level security;
drop policy if exists "owner manages own logs" on medication_logs;
create policy "owner manages own logs" on medication_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists medication_logs_med_idx on medication_logs(medication_id);
