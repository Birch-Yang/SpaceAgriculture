-- Browser questions and iMessage replies share two attempts per active turn.
-- The previous table/migration is kept intact for already-deployed projects.
create or replace function public.claim_photon_advice(p_run_id uuid, p_turn integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  active_session public.mission_control_sessions%rowtype;
  claimed_count integer;
begin
  select * into active_session from public.mission_control_sessions
    where run_id = p_run_id for update;
  if not found or active_session.expires_at <= now() or active_session.outage
    or active_session.last_turn <> p_turn or p_turn not between 1 and 30 then
    return null;
  end if;

  insert into public.photon_advice_usage (run_id, turn, request_count)
  values (p_run_id, p_turn, 1)
  on conflict (run_id, turn) do update
    set request_count = public.photon_advice_usage.request_count + 1
    where public.photon_advice_usage.request_count < 2
  returning request_count into claimed_count;
  return claimed_count;
end;
$$;
revoke all on function public.claim_photon_advice(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_photon_advice(uuid, integer) to service_role;
