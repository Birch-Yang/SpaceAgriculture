create table if not exists public.photon_advice_usage (
  run_id uuid not null,
  turn integer not null check (turn > 0),
  request_count integer not null default 0 check (request_count between 0 and 2),
  primary key (run_id, turn)
);

alter table public.photon_advice_usage enable row level security;

create or replace function public.claim_photon_advice(p_run_id uuid, p_turn integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_count integer;
begin
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
