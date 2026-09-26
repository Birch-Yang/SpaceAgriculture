# Ten-mission QA — 2026-09-26

Baseline: dev commit 029917a. These are ten offline automated missions through the production reducer and turn resolver, not ten manually clicked browser playthroughs. Browser checks separately covered the title → briefing → setup path. Earlier control verification is not counted as part of these ten runs.

No simulation rules changed. No API calls, LLM evaluation, Photon messages, or public leaderboard entries were made. Minigames, deployed hosting, network failures, and report submission are not covered by this run set.

Each mission used a distinct deterministic UUID and its actual seedForLevel seed. Eight Challenge and two Progressive scenarios resolved 103 total turns: four passed, six failed, no engine exceptions. Outcomes are illustrative, not a win-rate estimate: strategy and seed both vary. Progressive active care reached level 2; level 3 remains untested.

The six crop scenarios retain the default lettuce in slot 0 and plant the tested crop in slot 1. Their results are not pure-crop comparisons. No layout expansion was performed between Progressive levels. Planning follows the UI's advertised maximum AP, intentionally exposing any mismatch with resolver recovery.

## Results

| Run | Scenario | Result | Resolved turns | Crops / meat | Rule score / 70 |
|---|---|---|---:|---:|---:|
| 1 | Connected lettuce, active care | PASS | 10 | 32 / 20 | 61.6 |
| 2 | Connected potato, active care | PASS | 10 | 19 / 20 | 59.8 |
| 3 | Connected radish, active care | FAIL | 11 | 32 / 20 | 59 |
| 4 | Connected chili, active care | FAIL | 11 | 21 / 20 | 57.5 |
| 5 | Connected soybean, active care | PASS | 10 | 18 / 20 | 59.7 |
| 6 | Research crop with default lettuce | PASS | 10 | 17 / 20 | 59.5 |
| 7 | Disconnected outpost | FAIL | 7 | 0 / 0 | 22.6 |
| 8 | Habitat-only novice start | FAIL | 5 | 0 / 0 | 22.2 |
| 9 | Progressive active care | FAIL | 19 | 96 / 36 | 61.9 |
| 10 | Progressive passive farming | FAIL | 10 | 0 / 20 | 57.8 |

## Findings by priority

### P1 — AP planner permits actions that the resolver rejects (7/10 missions)

Challenge starts with food 26. The UI permits four AP worth of queued actions using maxActionPoints, but resolver recovery is floor(4 × 0.9) = 3. In runs 1–7 a queued feeding action was rejected with `Insufficient action points`. This is reproducible without any prior food loss. The UI does label the value MAX and mentions food shortages, but it does not expose the actual recoverable number before confirmation.

Sources: `src/game/phaser/GameClient.tsx` queue and AP header; `src/game/simulation/resolveTurn.ts` maxActionPoints and apRecovery. Suggested handoff: Developer B expose the authoritative recoverable AP selector; Developer C consume it in planning and HUD. Do not duplicate the formula in UI.

### P1 — Removing a connected building still loses paid corridor materials

Targeted reproduction after the ten missions: connected sample base has 27 materials. Removing the Standard Greenhouse refunds 28, leaving 55, but also deletes its two one-cell corridor edges. Their two paid materials are lost. The corrected full building refund works for unconnected buildings; the attached corridor case is not a full undo. Deleting a corridor directly also charges the existing removal fee.

Source: `src/game/state/reducer.ts` REMOVE_MODULE/REMOVE_CORRIDOR. A full undo including attached infrastructure would need an explicitly coordinated economy change, not a UI-only fix.

### P2 — Production score can be full even with zero crops

Run 10 fails its crop threshold (0 of 12 crops) but gets 28/28 production points because 20 meat against a target of 7 offsets the crop deficit before clamping. It finishes with 57.8/70 rule points despite FAIL. This is an explainability/scoring-design problem, not an engine crash.

Source: `src/game/simulation/scoring.ts` combines crop and meat ratios before clamping. Developer B should decide whether to cap each target contribution individually or document the compensation rule.

### P2 — End-of-mission crisis creates an eleventh turn without matching UI copy

Runs 3 and 4 enter a power crisis on turn 10 and resolve a recovery turn 11. A one-turn recovery window may be intentional, but onboarding promises 10 turns and GameClient formats the header as TURN {turn}/10. The player can therefore see 11/10. Recommend an explicit Emergency Recovery label rather than silently truncating recovery.

Sources: `src/game/simulation/resolveTurn.ts` crisis and completion ordering; `src/game/phaser/GameClient.tsx` turn header.

### P2 — Initial launch allows a base that cannot meet production goals

Run 8 starts with only a habitat and fails on turn 5 with zero production. Run 7 has six modules but no corridors, produces nothing, and fails on turn 7. Both are accepted by startOperation, which checks only for a habitat. These are valid strategic failures, but the locked-layout transition provides no specific preflight warning about missing agriculture or connectivity. Recommend a non-blocking readiness summary before Begin Mission.

Source: `src/game/state/reducer.ts` startOperation. Connectivity/readiness must come from existing engine selectors.

## Additional presentation observations

The home page's project description remains visibly marked PLACEHOLDER COPY. This was previously authorized, so it is unfinished demo content rather than a regression. The title, briefing, and setup navigation loaded successfully in the local browser.

## Reproduce

From the repository root: `node --experimental-strip-types src/ui/qa/ten-missions.mjs`.

Per-turn actions, rejections, hazards, resources, and production are saved in `ten-missions-2026-09-26.json`. The harness originally used an invalid shorthand for chili; the retained ten-run dataset was regenerated with the authoritative `chili-pepper` ID. That fixture error is not reported as a game defect.
