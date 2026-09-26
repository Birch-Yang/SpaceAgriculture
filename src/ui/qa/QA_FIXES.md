# QA fixes — 2026-09-26

Branch: `balance/qa-fixes-2026-09-26`. Previous version: `029917a`.

- AP: expose the existing `apRecovery(state)` calculation; use it for HUD and queue validation. No AP balance values changed.
- Initial construction removal: return the full building cost plus the cost of attached deleted corridor cells. Direct corridor removal returns its construction cost instead of charging 1 material. Non-initial reducer rules and move costs are unchanged. `getBuildRemovalRefund(state, targetId)` provides the exact material delta to UI and reducer.
- Production scoring: each category contributes at most 14 points, total 28. Excess meat no longer compensates for missing crops (and vice versa).
- `selectTurnLabel(state)` explicitly identifies turns above 10 as emergency recovery; the recovery rule is preserved.
- `selectBuildReadinessWarnings(state)` provides advisory missing-agriculture, disconnected-module and missing-supply warnings. Start anyway preserves deliberate play choices; the existing habitat requirement still applies.

GameState and serialized actions remain unchanged. Backend replay automatically uses the new reducer and scoring code; old stored leaderboard entries are not migrated or rescored. Active clients should refresh before starting a new run so local and server rules agree.

Validation: typecheck, build, 36 tests; ten seeded engine missions rerun with zero AP-limit rejections; targeted removal reproducer now returns 30 materials for a 28-material greenhouse plus two corridor cells; zero-crop production score falls from 28 to 14. Water-starvation action rejections in the Progressive stress run remain correct resource validation, not AP errors. Readiness panel checked in the browser. No live Photon/LLM or public leaderboard testing.

The original ten-run report and JSON remain preserved. Fixed-run results are separate.
