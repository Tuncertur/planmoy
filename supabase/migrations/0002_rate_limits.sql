-- Rate limiting — PROJECT_RULES: "her uç nokta için saatlik/aylık üst limit"
-- Demo/anonim hesaplar dahil, hiçbir kullanıcı sınırsız yazma yapamaz.

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

create trigger tasks_rate_limit
  before insert on tasks
  for each row execute function enforce_task_rate_limit();

-- Aynı desen: etkinlik/appointment oluşturma da sınırlandırılır (spam/DoS riski).
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

create trigger events_rate_limit
  before insert on events
  for each row execute function enforce_event_rate_limit();
