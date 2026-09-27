alter table public.mission_control_sessions
  add column if not exists question_count integer not null default 0,
  add column if not exists limit_notice_sent boolean not null default false;

-- This row lock makes simultaneous webhook deliveries share the same two-question quota.
create or replace function public.claim_mission_question(p_run_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare current_session public.mission_control_sessions%rowtype;
begin
  select * into current_session from public.mission_control_sessions
    where run_id = p_run_id and expires_at > now() and not outage for update;
  if not found then return -2; end if;
  if current_session.question_count < 2 then
    update public.mission_control_sessions set question_count = question_count + 1 where run_id = p_run_id;
    return current_session.question_count + 1;
  end if;
  if current_session.limit_notice_sent then return -1; end if;
  update public.mission_control_sessions set limit_notice_sent = true where run_id = p_run_id;
  return 0;
end;
$$;
revoke all on function public.claim_mission_question(uuid) from public, anon, authenticated;
grant execute on function public.claim_mission_question(uuid) to service_role;

create or replace function public.claim_mission_message(p_run_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare updated_count integer;
begin
  update public.mission_control_sessions set message_count = message_count + 1
    where run_id = p_run_id and expires_at > now() and not outage and message_count < 100;
  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;
revoke all on function public.claim_mission_message(uuid) from public, anon, authenticated;
grant execute on function public.claim_mission_message(uuid) to service_role;

create or replace function public.release_mission_message(p_run_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.mission_control_sessions set message_count = greatest(0, message_count - 1)
    where run_id = p_run_id;
end;
$$;
revoke all on function public.release_mission_message(uuid) from public, anon, authenticated;
grant execute on function public.release_mission_message(uuid) to service_role;
