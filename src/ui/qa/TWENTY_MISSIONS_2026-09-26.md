# Twenty-mission playtest — 2026-09-26

Tested version: `1fd5fc61efe213e8b12ad3c33f5449e408ce4410`.

These are 20 offline automated engine playthroughs, not 20 manual browser sessions. Five policies run against the same four deterministic run IDs (suffixes 101–104). The policy never inspects future hazards. No game code or balance values changed; no leaderboard entries were submitted. Multiplayer/network, Photon, LLM reports, minigames, pointer controls, and production deployment are outside this test.

Active policies use the same connected six-building base, harvest ready plots, plant a second lettuce plot, repair buildings below 65% integrity, set water/light inputs, water and feed, within actual AP recovery. They do not repair corridors, use backup allocations, or expand between Progressive levels. Passive runs keep the default single lettuce plot and livestock with no actions. Thus passive-vs-active is not a single-variable comparison. High-vs-medium Challenge runs are paired input-policy comparisons; action timing/AP use can also differ.

## Results

20/20 missions reached completion; 223 turns resolved; 6 PASS, 14 FAIL. No engine exceptions or AP-limit rejections. Six insufficient-water action rejections occurred across three Progressive missions. This deliberately mixed sample is not an estimate of player win rate.

| Run | Policy | Seed suffix | Result | Turns | Final level | Crops / meat | Rule score /70 | Failure |
|---|---|---:|---|---:|---:|---|---:|---|
| 1 | Challenge high-input active | 101 | PASS | 10 | 1 | 28 / 20 | 61 | — |
| 2 | Challenge high-input active | 102 | FAIL | 11 | 1 | 32 / 20 | 59 | Crisis not recovered: power depleted |
| 3 | Challenge high-input active | 103 | PASS | 10 | 1 | 26 / 20 | 60.7 | — |
| 4 | Challenge high-input active | 104 | PASS | 10 | 1 | 32 / 20 | 61.6 | — |
| 5 | Challenge medium-input active | 101 | PASS | 10 | 1 | 16 / 20 | 59.4 | — |
| 6 | Challenge medium-input active | 102 | FAIL | 11 | 1 | 27 / 20 | 58.3 | Crisis not recovered: power depleted |
| 7 | Challenge medium-input active | 103 | PASS | 10 | 1 | 22 / 20 | 60.2 | — |
| 8 | Challenge medium-input active | 104 | PASS | 10 | 1 | 25 / 20 | 60.6 | — |
| 9 | Challenge passive | 101 | FAIL | 10 | 1 | 0 / 20 | 43.2 | Production threshold missed (16 crop, 10 meat) |
| 10 | Challenge passive | 102 | FAIL | 11 | 1 | 0 / 20 | 40.6 | Crisis not recovered: power depleted |
| 11 | Challenge passive | 103 | FAIL | 10 | 1 | 0 / 20 | 43.2 | Production threshold missed (16 crop, 10 meat) |
| 12 | Challenge passive | 104 | FAIL | 10 | 1 | 0 / 20 | 43.2 | Production threshold missed (16 crop, 10 meat) |
| 13 | Challenge disconnected active | 101 | FAIL | 7 | 1 | 0 / 0 | 22.6 | Crisis not recovered: power depleted |
| 14 | Challenge disconnected active | 102 | FAIL | 5 | 1 | 0 / 0 | 20.9 | Crisis not recovered: power depleted |
| 15 | Challenge disconnected active | 103 | FAIL | 7 | 1 | 0 / 0 | 22.6 | Crisis not recovered: power depleted |
| 16 | Challenge disconnected active | 104 | FAIL | 7 | 1 | 0 / 0 | 20.9 | Crisis not recovered: power depleted |
| 17 | Progressive high-input active | 101 | FAIL | 18 | 2 | 89 / 36 | 62.2 | Crisis not recovered: water depleted |
| 18 | Progressive high-input active | 102 | FAIL | 20 | 2 | 63 / 40 | 61.4 | Crisis not recovered: water depleted |
| 19 | Progressive high-input active | 103 | FAIL | 19 | 2 | 70 / 36 | 61.3 | Crisis not recovered: water depleted |
| 20 | Progressive high-input active | 104 | FAIL | 17 | 2 | 61 / 32 | 61.7 | Crisis not recovered: water depleted |

## Insights and follow-up priorities

1. **Reserves, not production alone, decide survival.** Both active Challenge policies passed 3/4 seeds, but seed 102 failed at turn 11 from depleted power despite exceeding both production targets. High inputs averaged 29.5 crops; medium inputs 22.5. Medium inputs did not prevent this particular failure. Test connected batteries/backup capacity and corridor repair before changing hazard balance. Four seeds are too few to establish an optimal policy.

2. **Progressive needs an explicit expansion checkpoint.** All four runs cleared level 1 and failed from water depletion during level 2 (17–20 total turns). These runs intentionally spent no intermission construction budget. This demonstrates the risk of carrying the starter base forward unchanged; it does not show that Progressive is unwinnable. Explain water capacity and retained reserves before the next level. Level 3 was not reached.

3. **Livestock care has weak visible differentiation in this fixture.** All connected Challenge runs produced 20 meat, including passive runs with no feeding actions. Code inspection confirms baseline feeding automatically consumes food; FEED_STALL is supplemental care. Rounding, timing and the small fixture can hide its benefit. Label this distinction clearly and test more livestock configurations before tuning care values.

4. **Harvesting needs a clear prompt.** Passive runs finished with zero cumulative crops while still producing meat. Crops require harvesting; livestock outputs are automatic. Make this asymmetry explicit in onboarding and ready-to-harvest indicators. Passive runs also planted fewer plots, so they are not controlled yield comparisons.

5. **Failure and score can send conflicting signals.** Failed Progressive runs scored 61.3–62.2/70, above several successful Challenge runs. Those scores include accumulated production and differ in level/mode; they should not be treated as equivalent achievements. Keep PASS/FAIL, mode and reached level prominent in reports and rankings. The earlier zero-crop full-production-score bug remains fixed: passive runs receive only 14/28 production points.

6. **Disconnected starts remain deliberately fatal.** All four failed in 5–7 turns with no crop or meat production. The readiness warning is useful, but Start anyway still allows this choice. These are expected strategic failures, not engine crashes.

7. **Resource-aware action feedback deserves a UI follow-up.** Six watering actions were rejected for insufficient water across three Progressive runs. The engine correctly enforces the constraint. These automated rejections alone do not establish a browser UI bug; check whether the UI clearly previews water costs and earlier queued spending before implementing changes.

## Reproduce / evidence

`node --experimental-strip-types src/ui/qa/twenty-missions.mjs`

Raw per-turn states, action acceptances/rejections and hazard records: `twenty-missions-2026-09-26.json`. Original ten-run data is preserved. The attached-removal smoke check again reports zero lost materials.
