# Six-crop mission acceptance standard

This document supersedes the earlier three-crop balance proposal and the former 12-turn Supply Lab acceptance target. The single ranked player journey is the 10-turn Challenge or 30-turn Progressive mission at `/game`. The old `/supply` URL redirects there. No Supply Lab score is combined with mission results.

## Authoritative rules

- The roster is exactly `lettuce`, `radish`, `chili-pepper`, `potato`, `soybean`, and `arabidopsis`, from `src/data/crop-catalog.json`. No other crop ID is accepted in a submission.
- All six choices appear in the mission greenhouse slots. Each slot's crop, growth, water, light, temperature and care are simulated by the mission resolver. Arabidopsis yields research samples, never edible crop yield or food. Its samples are recorded separately in the mission summary.
- The mission resolver and connected utility graph determine growth, harvest, resources, hazards, crisis recovery and pass/fail. `scoreRules` uses the resulting state. The server replays the accepted action transcript before saving a run; the report and leaderboard are based on that replayed result.
- Challenge is 10 turns. Progressive is up to three 10-turn levels, retaining the base between levels. A failed mission still receives a report and may be saved as a completed run.
- The regional forecast is a fuzzy risk band for the next three turns derived from the same deterministic hazard schedule that resolves turn events. It includes solar, thermal, impact and system disruptions. It does not expose precise event turns.
- The report presents the actual score breakdown, cites curated scientific sources, identifies AI fallback, and distinguishes research samples from food production. Scores are game measures, not measured lunar yields.

## Records and observations

- The five public record categories are overall, production, stability, efficiency and resilience. The top 20 are shown in each category. Equal scores share a competition rank. Player Rank is the most recent **saved** run on the current browser, including runs outside the top 20; it is not an authenticated player account.
- A completed run must persist through Supabase before it can enter Records. The UI distinguishes an empty table from missing Supabase configuration. Missing credentials or migrations cannot be counted as a successful live-records acceptance.
- Player patterns report their sample sizes. Final-slot crop mix is labeled as such. Separate process metrics come from replayable accepted actions: planting, crop switches, harvest actions, parameter changes, and early or late choices.
- Resource-pressure observations use end-of-turn water or power below 25 game units; layout comparisons use the recorded final module positions. Production/resilience groups use protective module cost share. These are descriptive samples, subject to self-selection and mode/skill differences; they are not causal claims.

## Verification gate

1. `npm test`, `npm run typecheck`, and `npm run build` pass.
2. Tests cover all six crop IDs in the official mission engine, research-only output, deterministic hazard forecast against its schedule, and action-history metrics.
3. With Supabase configured and migrations applied, finish a mission, confirm `/api/runs` returns `saved: true`, open Records from the landing page, and confirm the saved run's category rank and report.
4. Without Supabase configuration, Records show a configuration error; no local-only result is presented as a public rank.
5. Live database and AI behavior remain externally unverified until deployment credentials and schema are supplied.
