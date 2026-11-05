-- Planmoy — AI kullanım dönemi (faturalama dönemiyle hizalı sayaç). 0032 ÜZERİNE eklemelidir; 0032 henüz canlıya uygulanmadı.
-- Kullanıcı sayaçları (user_usage_cost) artık `p_period` anahtarıyla tutulur: ücretli abonelikte faturalama dönemi (b:YYYY-MM-DD),
-- belirsizse takvim ayı (YYYY-MM, yaklaşık). PROJE tavanı (project_cost_month) sağlayıcı faturası takvim ayı olduğu için takvim ayında KALIR.
-- p_period verilmezse davranış 0032 ile aynıdır (p_month). Eski 9 argümanlı çağrılar çalışmaya devam eder.
-- Geri alma: yeni fonksiyonu silip 0032'nin reserve_paid_api tanımını yeniden oluşturmak yeterlidir; `period` sütunu zararsızdır.

alter table paid_api_ledger add column if not exists period text;

drop function if exists reserve_paid_api(uuid, text, text, numeric, numeric, boolean, integer, numeric, text);

create or replace function reserve_paid_api(
  p_user_id uuid, p_month text, p_surface text, p_amount numeric,
  p_user_cap numeric, p_counts_query boolean, p_query_limit integer,
  p_project_cap numeric, p_idem_key text default null, p_period text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := coalesce(p_period, p_month);
  u user_usage_cost%rowtype;
  proj numeric;
  existing paid_api_ledger%rowtype;
  new_id uuid;
begin
  if p_amount is null or p_amount < 0 or p_user_cap is null or p_project_cap is null or p_month is null or p_surface is null
     or length(v_period) > 40 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid-request', 'ledger_id', null);
  end if;
  if p_user_cap <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'plan-has-no-paid-api', 'ledger_id', null);
  end if;

  perform pg_advisory_xact_lock(hashtext('paid_api:' || p_user_id::text));

  if p_idem_key is not null then
    select * into existing from paid_api_ledger where user_id = p_user_id and idem_key = p_idem_key;
    if found and existing.status in ('reserved', 'settled') then
      return jsonb_build_object('allowed', false, 'reason', 'duplicate-request', 'ledger_id', existing.id);
    end if;
  end if;

  insert into user_usage_cost (user_id, month, estimated_cost_usd) values (p_user_id, v_period, 0)
    on conflict (user_id, month) do nothing;
  select * into u from user_usage_cost where user_id = p_user_id and month = v_period for update;

  if p_counts_query and u.text_queries >= greatest(coalesce(p_query_limit, 0), 0) then
    return jsonb_build_object('allowed', false, 'reason', 'monthly-query-limit-reached', 'ledger_id', null);
  end if;
  if u.estimated_cost_usd + p_amount > p_user_cap then
    return jsonb_build_object('allowed', false, 'reason', 'monthly-cost-cap-reached', 'ledger_id', null);
  end if;

  insert into project_cost_month (month, estimated_cost_usd) values (p_month, 0) on conflict (month) do nothing;
  select estimated_cost_usd into proj from project_cost_month where month = p_month for update;
  if proj + p_amount > p_project_cap then
    return jsonb_build_object('allowed', false, 'reason', 'project-cap-reached', 'ledger_id', null);
  end if;

  update user_usage_cost
     set estimated_cost_usd = estimated_cost_usd + p_amount,
         text_queries = text_queries + (case when p_counts_query then 1 else 0 end),
         updated_at = now()
   where user_id = p_user_id and month = v_period;
  update project_cost_month set estimated_cost_usd = estimated_cost_usd + p_amount, updated_at = now() where month = p_month;

  if existing.id is not null then
    update paid_api_ledger
       set status = 'reserved', reserved_usd = p_amount, actual_usd = null, counts_query = p_counts_query,
           month = p_month, period = v_period, surface = p_surface, settled_at = null
     where id = existing.id
     returning id into new_id;
  else
    insert into paid_api_ledger (user_id, month, period, surface, idem_key, reserved_usd, counts_query)
    values (p_user_id, p_month, v_period, p_surface, p_idem_key, p_amount, p_counts_query)
    returning id into new_id;
  end if;
  return jsonb_build_object('allowed', true, 'reason', null, 'ledger_id', new_id);
end;
$$;

-- Kapanış: kullanıcı satırı defterin DÖNEM anahtarıyla (period, yoksa month), proje satırı takvim ayıyla güncellenir.
create or replace function settle_paid_api(p_ledger_id uuid, p_actual numeric, p_provider_billed boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  l paid_api_ledger%rowtype;
  delta numeric;
begin
  select * into l from paid_api_ledger where id = p_ledger_id;
  if not found then return false; end if;
  perform pg_advisory_xact_lock(hashtext('paid_api:' || l.user_id::text));
  select * into l from paid_api_ledger where id = p_ledger_id for update;
  if l.status <> 'reserved' then return false; end if;

  if p_provider_billed then
    if p_actual is null or p_actual < 0 then return false; end if;
    delta := p_actual - l.reserved_usd;
    update user_usage_cost set estimated_cost_usd = greatest(estimated_cost_usd + delta, 0), updated_at = now()
     where user_id = l.user_id and month = coalesce(l.period, l.month);
    update project_cost_month set estimated_cost_usd = greatest(estimated_cost_usd + delta, 0), updated_at = now() where month = l.month;
    update paid_api_ledger set status = 'settled', actual_usd = p_actual, settled_at = now() where id = l.id;
  else
    update user_usage_cost
       set estimated_cost_usd = greatest(estimated_cost_usd - l.reserved_usd, 0),
           text_queries = greatest(text_queries - (case when l.counts_query then 1 else 0 end), 0),
           updated_at = now()
     where user_id = l.user_id and month = coalesce(l.period, l.month);
    update project_cost_month set estimated_cost_usd = greatest(estimated_cost_usd - l.reserved_usd, 0), updated_at = now() where month = l.month;
    update paid_api_ledger set status = 'refunded', actual_usd = 0, settled_at = now() where id = l.id;
  end if;
  return true;
end;
$$;

revoke all on function reserve_paid_api(uuid, text, text, numeric, numeric, boolean, integer, numeric, text, text) from public, anon, authenticated;
revoke all on function settle_paid_api(uuid, numeric, boolean) from public, anon, authenticated;
grant execute on function reserve_paid_api(uuid, text, text, numeric, numeric, boolean, integer, numeric, text, text) to service_role;
grant execute on function settle_paid_api(uuid, numeric, boolean) to service_role;
