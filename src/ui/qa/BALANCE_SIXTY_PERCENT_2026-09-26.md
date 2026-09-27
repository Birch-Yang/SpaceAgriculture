# Moderate mission easing — 2026-09-26

Experimental branch: `balance/sixty-percent-pass-2026-09-26`, created from `balance/hidden-hazard-avoidance-2026-09-26` at `abec1d4`. The previous values remain on that branch. This iteration has not been merged into `dev` or `main` and has not been synchronized to other branches.

The requested target is about 60% of players completing a mission. No player cohort or live completion telemetry is available, so the percentages below are **scripted playthrough pass rates**, not estimates of a human pass rate. The QA suite contains five fixed strategies (three connected active, one passive, one disconnected), shared deterministic seeds, and paired emergency-response on/off runs. Passive and disconnected builds remain deliberately poor controls. A live playtest with diverse first-time players is required to validate the product target.

| Balance value | Previous | This branch |
| --- | ---: | ---: |
| Challenge starting power | 24 | 28 |
| Progressive Level 1 starting power | 34 | 38 |
| Challenge cumulative crop target | 16 | 14 |
| Progressive Level 3 hazard pressure | 100 | 90 |

All other resource capacities, growth cycles, yields, meat targets, costs, AP, hazard algorithms, hidden avoidance rules, and scoring formulas are unchanged. Lowering Level 3 hazard pressure from 100 to 90 retains the same five-event schedule tier. No GameState or backend interface changed.

| Scripted cohort | Previous with response | This branch with response | Previous without response | This branch without response |
| --- | ---: | ---: | ---: | ---: |
| Original 4 seeds × 5 strategies | 11/20 (55%) | 12/20 (60%) | 8/20 (40%) | 8/20 (40%) |
| Held-out 20 seeds × 5 strategies | 54/100 (54%) | 59/100 (59%) | 36/100 (36%) | 40/100 (40%) |

On the held-out assisted cases, connected high-input Challenge improved 19→20, connected medium-input Challenge 17→20, and connected high-input Progressive 18→19. Passive and disconnected controls stayed at 0/20 each. These proportions are sensitive to the chosen strategy mix; they should not be presented as a real player success rate.

Reproduce with `node --experimental-strip-types src/ui/qa/pass-rate-calibration-2026-09-26.mjs`. The default run uses original seeds 101–104 and current balance. Use `CALIBRATION_SEEDS=$(seq -s, 105 124)` for the held-out set. To reconstruct the previous branch's values in memory without changing production files, set `CALIBRATION_POWER_DELTA=-4 CALIBRATION_CHALLENGE_CROP_TARGET=16 CALIBRATION_PROG_L3_PRESSURE=100`. The script prints case-level outcomes and final production/resources; it uses no user data or API results. Set `CALIBRATION_OUTPUT=/path/to/results.json` to save a local copy.

Validation: `npm run typecheck`, `npm test` (47 passing), and `npm run build`. Before integration, playtest both modes with real players, check whether about 60% of the intended audience pass, and adjust in a *new* balance branch if needed.
