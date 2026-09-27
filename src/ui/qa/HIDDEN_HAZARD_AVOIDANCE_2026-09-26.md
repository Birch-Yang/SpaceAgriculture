# Hidden advance preparation — experimental balance

Branch: `balance/hidden-hazard-avoidance-2026-09-26`. The prior same-turn response remains on `balance/same-turn-hazards-2026-09-26` at `60fad03`; this iteration does not change `dev` or `main`. New, separate preview: `public/assets/previews/emergency-actions-v3.html`. Versions v1 and v2 remain intact.

The current hazard is still visible during its turn. At settlement, the resolver checks the authoritative scheduled hazard against the **state entering that turn**, before queued actions. Meeting the matching secret condition makes the recorded hazard severity zero; the event remains in history, replay and reports. Otherwise the existing same-turn response can still reduce severity by 70%. The UI must never preview the hidden readiness flag or exact thresholds before settlement. It may show the result afterward through `lastTurn.warnings` and `lastTurn.hazard.severity`.

Developer-only thresholds, configured in `src/data/hazardAvoidance.ts`:

| Hazard | Advance condition |
| --- | --- |
| Temperature | Previous completed turn in the same level finished at 16–24 °C; entering reserve has at least 12 power; a connected utility module has at least 85% integrity and at least 50% thermal allocation. |
| Radiation | A connected shelter has at least 90% integrity; entering oxygen reserve is at least 25. |
| Micrometeoroid | A connected shelter has at least 90% integrity; every installed module enters the turn at 90% integrity or better. |
| Communications | A connected communications tower and connected utility module each have at least 85% integrity; utility communications backup allocation is at least 20%; entering power reserve is at least 12. |
| Power | A connected battery has at least 85% integrity; entering power reserve is at least 18. |

These are gameplay conditions, not predictions or scientific claims about preventing real lunar hazards. In particular, zero severity represents the simulation's avoided *consequence*, not removal of the physical event. The fuzzy forecast remains unchanged and never exposes an exact future event. The communications link treats a zero-severity communications hazard as avoided, so a preempted outage does not still appear as a lost link.

No `GameState`, action, scoring, Supabase, or Photon schema changed. The existing `TurnSummary.hazard`, `TurnRecord.hazard`, warnings, and history carry the outcome. The previous experimental 70% same-turn response still works when the advance condition was absent. Exact conditions belong in team documentation only; player-facing copy should invite preparation and explain the result afterward without giving the formula.

Validation: `npm run typecheck`, `npm test` (47 passed), and `npm run build`. Tests cover all five successes, failed prerequisites, before-action timing, the surviving same-turn response, and the communications link. The thresholds are experimental and should receive player testing before merging to `dev`.
