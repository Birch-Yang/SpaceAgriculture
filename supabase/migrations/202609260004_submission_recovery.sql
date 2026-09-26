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
