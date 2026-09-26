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
