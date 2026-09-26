create table if not exists public.run_submission_claims (
  run_id uuid primary key,
  requester_hash text not null,
  claimed_at timestamptz not null default now(),
  result_json jsonb,
  saved boolean not null default false
);

create index if not exists run_submission_claims_requester_idx
  on public.run_submission_claims (requester_hash, claimed_at desc);
alter table public.run_submission_claims enable row level security;

create or replace function public.claim_run_submission(p_run_id uuid, p_requester_hash text)
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
    return 'duplicate';
  end if;
  if (select count(*) from public.run_submission_claims where claimed_at > now() - interval '24 hours') >= 100 then
    return 'rate_limited';
  end if;
  if (select count(*) from public.run_submission_claims
      where requester_hash = p_requester_hash and claimed_at > now() - interval '24 hours') >= 5 then
    return 'rate_limited';
  end if;
  insert into public.run_submission_claims (run_id, requester_hash) values (p_run_id, p_requester_hash);
  return 'claimed';
end;
$$;

revoke all on function public.claim_run_submission(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_run_submission(uuid, text) to service_role;
