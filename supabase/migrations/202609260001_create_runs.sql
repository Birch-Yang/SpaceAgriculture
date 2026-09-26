create table if not exists public.runs (
  id uuid primary key,
  nickname text not null check (char_length(nickname) between 1 and 32),
  mode text not null check (mode in ('challenge', 'progressive')),
  score_total numeric,
  score_rules numeric,
  score_llm numeric,
  score_production numeric,
  score_stability numeric,
  score_efficiency numeric,
  score_resilience numeric,
  score_budget numeric,
  crop_yield numeric,
  meat_yield numeric,
  passed boolean,
  created_at timestamptz not null default now(),
  layout_json jsonb not null default '{}'::jsonb,
  strategy_json jsonb not null default '{}'::jsonb,
  hazard_json jsonb not null default '[]'::jsonb,
  summary_json jsonb not null default '{}'::jsonb
);

create index if not exists runs_score_total_idx on public.runs (score_total desc);
create index if not exists runs_crop_yield_idx on public.runs (crop_yield desc);
create index if not exists runs_score_stability_idx on public.runs (score_stability desc);
alter table public.runs enable row level security;
create policy "Public results are readable" on public.runs for select to anon using (true);
-- Inserts are made by a server-only service-role client. Never expose that key to the browser.
