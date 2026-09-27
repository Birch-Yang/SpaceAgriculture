BEGIN;
-- Apply 002, 003, and 004 to the existing agronaut Supabase project.
-- Do not include the 001 runs policy again.

-- supabase/migrations/202609260002_submission_claims.sql
create table if not exists public.run_submission_claims (
  run_id uuid primary key,
  transcript_hash text not null,
  requester_hash text not null,
  claimed_at timestamptz not null default now(),
  result_json jsonb,
  saved boolean not null default false
);

create index if not exists run_submission_claims_requester_idx
  on public.run_submission_claims (requester_hash, claimed_at desc);
alter table public.run_submission_claims enable row level security;

create or replace function public.claim_run_submission(p_run_id uuid, p_requester_hash text, p_transcript_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('run-submissions-global')::bigint);
  perform pg_advisory_xact_lock(hashtext(p_requester_hash)::bigint);
  delete from public.run_submission_claims where claimed_at < now() - interval '24 hours';
  if exists (select 1 from public.run_submission_claims where run_id = p_run_id) then
    if exists (select 1 from public.run_submission_claims where run_id = p_run_id and transcript_hash = p_transcript_hash) then
      return 'duplicate';
    end if;
    return 'conflict';
  end if;
  if (select count(*) from public.run_submission_claims where claimed_at > now() - interval '24 hours') >= 100 then
    return 'rate_limited';
  end if;
  if (select count(*) from public.run_submission_claims
      where requester_hash = p_requester_hash and claimed_at > now() - interval '24 hours') >= 5 then
    return 'rate_limited';
  end if;
  insert into public.run_submission_claims (run_id, requester_hash, transcript_hash) values (p_run_id, p_requester_hash, p_transcript_hash);
  return 'claimed';
end;
$$;

revoke all on function public.claim_run_submission(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_run_submission(uuid, text, text) to service_role;

-- supabase/migrations/202609260003_mission_control.sql
create table if not exists public.mission_control_sessions (
  run_id uuid primary key,
  space_hash text not null unique,
  space_cipher text not null,
  session_token_hash text not null,
  public_state jsonb not null,
  outage boolean not null default false,
  advice_history jsonb not null default '[]'::jsonb,
  last_turn integer not null default 0,
  message_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists mission_control_sessions_expiry_idx on public.mission_control_sessions (expires_at);
alter table public.mission_control_sessions enable row level security;

create table if not exists public.mission_control_webhook_messages (
  message_id text primary key,
  received_at timestamptz not null default now()
);
alter table public.mission_control_webhook_messages enable row level security;

create table if not exists public.mission_control_enrollments (
  run_id uuid primary key,
  requester_hash text not null,
  claimed_at timestamptz not null default now()
);
create index if not exists mission_control_enrollments_requester_idx
  on public.mission_control_enrollments (requester_hash, claimed_at desc);
alter table public.mission_control_enrollments enable row level security;

create or replace function public.claim_mission_enrollment(p_run_id uuid, p_requester_hash text)
returns text language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('mission-enrollments-global')::bigint);
  perform pg_advisory_xact_lock(hashtext(p_requester_hash)::bigint);
  delete from public.mission_control_enrollments where claimed_at < now() - interval '24 hours';
  if exists (select 1 from public.mission_control_enrollments where run_id = p_run_id) then
    return 'duplicate';
  end if;
  if (select count(*) from public.mission_control_enrollments where claimed_at > now() - interval '24 hours') >= 100 then
    return 'rate_limited';
  end if;
  if (select count(*) from public.mission_control_enrollments
      where requester_hash = p_requester_hash and claimed_at > now() - interval '24 hours') >= 3 then
    return 'rate_limited';
  end if;
  insert into public.mission_control_enrollments (run_id, requester_hash) values (p_run_id, p_requester_hash);
  return 'claimed';
end;
$$;
revoke all on function public.claim_mission_enrollment(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_mission_enrollment(uuid, text) to service_role;

create or replace function public.claim_mission_message(p_run_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare updated_count integer;
begin
  update public.mission_control_sessions
    set message_count = message_count + 1
    where run_id = p_run_id and expires_at > now() and not outage and message_count < 25;
  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;
revoke all on function public.claim_mission_message(uuid) from public, anon, authenticated;
grant execute on function public.claim_mission_message(uuid) to service_role;

create or replace function public.append_mission_advice(p_run_id uuid, p_advice text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.mission_control_sessions
    set advice_history = advice_history || jsonb_build_array(left(p_advice, 600))
    where run_id = p_run_id and expires_at > now();
end;
$$;
revoke all on function public.append_mission_advice(uuid, text) from public, anon, authenticated;
grant execute on function public.append_mission_advice(uuid, text) to service_role;

create or replace function public.cleanup_mission_control()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.mission_control_sessions where expires_at < now();
  delete from public.mission_control_webhook_messages where received_at < now() - interval '48 hours';
  delete from public.mission_control_enrollments where claimed_at < now() - interval '24 hours';
end;
$$;
revoke all on function public.cleanup_mission_control() from public, anon, authenticated;
grant execute on function public.cleanup_mission_control() to service_role;

-- supabase/migrations/202609260004_submission_recovery.sql
-- Preserve run IDs across quota windows and allow one bounded recovery attempt
-- when evaluation finished but neither the result cache nor the run row persisted.
alter table public.run_submission_claims
  add column if not exists attempt_count integer not null default 1;

create or replace function public.claim_run_submission(p_run_id uuid, p_requester_hash text, p_transcript_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare existing public.run_submission_claims%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext('run-submissions-global')::bigint);
  perform pg_advisory_xact_lock(hashtext(p_requester_hash)::bigint);
  select * into existing from public.run_submission_claims where run_id = p_run_id;
  if found then
    if existing.transcript_hash <> p_transcript_hash then return 'conflict'; end if;
    if existing.result_json is null and not existing.saved then
      if existing.attempt_count >= 2 then return 'retry_exhausted'; end if;
      if existing.claimed_at < now() - interval '2 minutes' then
        update public.run_submission_claims
          set attempt_count = attempt_count + 1, claimed_at = now()
          where run_id = p_run_id;
        return 'claimed';
      end if;
    end if;
    return 'duplicate';
  end if;
  if (select count(*) from public.run_submission_claims where claimed_at > now() - interval '24 hours') >= 100 then
    return 'rate_limited';
  end if;
  if (select count(*) from public.run_submission_claims
      where requester_hash = p_requester_hash and claimed_at > now() - interval '24 hours') >= 5 then
    return 'rate_limited';
  end if;
  insert into public.run_submission_claims (run_id, requester_hash, transcript_hash)
    values (p_run_id, p_requester_hash, p_transcript_hash);
  return 'claimed';
end;
$$;

revoke all on function public.claim_run_submission(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_run_submission(uuid, text, text) to service_role;

-- supabase/migrations/202609260005_photon_turn_questions.sql
alter table public.mission_control_sessions
  add column if not exists question_count integer not null default 0,
  add column if not exists limit_notice_sent boolean not null default false;

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

COMMIT;
