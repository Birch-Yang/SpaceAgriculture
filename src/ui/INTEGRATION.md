# Developer C handoff

Branch: `feat/ui-content`. Based on Developer B's `origin/feat/bootstrap-simulation`, because `dev` contained only README at checkout. Integrate that bootstrap before these UI commits; do not merge this branch into main. No existing tracked app, engine, state, backend, AI, config, or dependency files were changed.

## Preserved design workflow

The user's latest instruction is to preserve the original and put design changes into HTML. Existing `app/**` files remain untouched. `public/assets/previews/original-landing.html` preserves the original landing presentation. `ui-v1.html` is the first proposal; `ui-v6.html` is the latest React presentation snapshot. New revisions must be new numbered HTML snapshots; the generator refuses to overwrite an existing snapshot.

Open the HTML via a local server or the Next public asset URL `/assets/previews/ui-v6.html`. It contains sample data, local screen controls, and no simulation/network actions. Open individual HTML files locally with the sibling assets retained. Run `node src/ui/preview/generate.cjs v7` (or the next unused number) to render the current React components into a new snapshot. The generator uses the project's existing TypeScript and React packages; it adds no dependency.

## Exposed presentation interfaces

- `LandingPage`: `onStart(nickname, mode)`, `pending`, `error`. The host creates the mission and handles navigation. No storage, account, or simulation creation here.
- `ResourcePanel`: read-only GameState budget/AP/turn/level/resources/production, supplied severity map, optional units and authoritative cumulative targets. Missing severity renders “Status unavailable”; no UI thresholds.
- `ModuleCard`: authoritative `ModuleDefinition`, optional variant badge, selection callback and disabled reason. Flow demand/supply and core stats always visible.
- `GreenhousePanel`, `LivestockPanel`: canonical crop/livestock state; emit existing `PlayerAction` through `onAction`. Supply disabled reasons and livestock status labels. The host validates/rejects actions and displays its rejection feedback.
- `UtilityPanel`: current allocation and backend-approved allocation presets, AP costs and disabled reasons. Emits REALLOCATE_UTILITY unchanged; no allocation legality or AP calculation.
- `RepairPanel`: backend-approved targets, integrity, AP costs and disabled reasons. Emits REPAIR unchanged.
- `ForecastPanel`: fuzzy `ForecastState` only; no schedule input. `HazardAlert`: current hazard type and optional supplied detail.
- `CrisisOverlay`: authoritative trigger and current response turn, inspect callback. In-flow urgent overlay panel keeps repair controls accessible; host may position it over the renderer without blocking current-turn response actions.
- `RecoverySuccess`, `MissionFailure`, `TutorialHint`: host decides when each applies. TutorialHint only displays in Progressive level 1.
- `MissionControlPanel`: `connection` online/offline/unavailable, immutable message history (`id`, `sender`, `text`, optional time label), loading flag. Host adapts B's individual Photon results into history; no Photon calls. Offline suppresses typing but preserves history.
- `MissionReport`: canonical report, nickname, precomputed total/rules/LLM scores, score fallback flag, verified source registry. Unknown source IDs and non-HTTPS citation URLs are omitted. All narrative renders as escaped text.
- `Leaderboard`: externally ranked rows (`id`, `nickname`, `mode`, `rank`, `score`, `passed`), selected category, category callback, current run ID, loading/error/retry props. Host fetches/sorts the selected metric and resolves ties; UI never rescores runs.
- `AnalyticsPanel`: B's aggregate data, loading/error/retry. Simple semantic bar charts show supplied selection counts. Percent display and bar geometry only; no simulation or aggregate calculations.
- `PixelAsset`: original sprite by folder/name, optional accessible label, fallback diamond on failed load.

Import `ui.module.css` via the components; wrap composed screens with its `root` class. CSS is scoped, self-contained, uses system fonts, and does not alter shared globals. Interactive composition belongs in the host's client component. Backend imports in UI are type-only.

## Missing/ambiguous upstream fields (no contracts changed)

1. Resource severity selectors, valid display units, and authoritative production targets. Use unavailable state until supplied.
2. Livestock per-module water delivery and temperature status.
3. Legal utility reallocation presets, repair AP costs, and per-action availability/rejection reason. Host should disable during pending turn resolution.
4. Photon history IDs/timestamps and distinction between network unavailability and in-game link loss. Adapt `MissionControlMessage` status plus the communications selector.
5. `getReport` currently omits `score_rules` and `score_llm` in its selected columns. Expose the stored values to render separate scores; do not reverse-engineer them in UI. `scoreWithFallback` supplies a normalized substitute LLM value, so pass `usedFallback` and show LLM unavailable.
6. `averageResilienceBudgetShare` currently counts protective modules / all modules, not budget spent. It is intentionally withheld pending B's verified cost-based metric. Clarify missing-distance sampling and per-run compact shares before stronger analytics claims.
7. No actual Photon provider is wired in the bootstrap. Live message QA remains an integration task.

## Integration steps

1. Land the bootstrap into `dev`; cherry-pick Developer C commits or merge this branch into `dev` through review.
2. Preserve the existing pages until the user authorizes page integration; review the separate HTML now.
3. Developer A mounts HUD/panels alongside Phaser and routes callbacks through the existing action dispatcher. Sprite loading and actual isometric footprints remain A's subsystem.
4. Developer B imports `curatedSources` from `src/content/sources.ts` in the existing source adapter, maps backend data to presentation props, and supplies the missing selectors above. No replacement loaders were added.
5. Review `src/content/prompt-qa.ts` against real generated messages and reports, including outage/fallback cases. This workstream reviewed fixtures and existing prompts; it did not call an unconfigured Photon service.
6. Use `docs/DEMO_SCRIPT.md` to rehearse the integrated game. Never present preview sample data as player observations.

## Assets and validation

24 SVG sprites: 13 modules including corridor, 3 crops, 3 animals, 5 hazards. See `public/assets/ASSETS.md` for dimensions, license, fallback, and engine integration notes.

Validation: `npm run typecheck`, `npm run build`, `npm test`; browser review of nickname enablement, landing, link loss, crisis, report, leaderboard, analytics, and original snapshot. Existing simulation tests pass; UI is not yet mounted in production pages at the user's request. No dependencies added, no secrets introduced, no deployment performed.

## Cozy art revision (latest attached brief)

Review `public/assets/previews/ui-v6.html`. Earlier snapshots and all legacy asset files are preserved. Source updates are confined to owned UI/content/assets. Existing pages and GameState remain untouched.

- The requested art roster is lettuce, radish, chili pepper, potato, soybean, Arabidopsis; it supersedes wheat in the new art collection only. B's canonical CropKind still contains lettuce/potato/wheat. **Do not cast CropArtId to CropKind.** B must coordinate the six-crop schema/config and research-sample semantics before connecting it to gameplay.
- `CropFieldGuide` displays all 24 stages. `crop-art.ts` exports art IDs and stage names only, with no balance data.
- `GreenhouseArtPanel` is a local presentation adapter: accepts crop art ID, explicit stage, settings, canCollect, disabledReason; exposes onCropIntent, onSettingIntent, onCollectIntent. The host supplies legality, AP and authoritative state. The existing canonical `GreenhousePanel` is retained for the current simulation contract.
- `ScienceDrawer` is a keyboard-accessible native details/summary panel. It uses the existing curated sources and keeps optional scientific context out of the main onboarding flow. Mission report scientific sections remain as required.
- `PixelAsset` now resolves the cozy-v1 set, with simple crop names mapped to ready icons. Legacy wheat remains compatible with its original icon until the schema is coordinated. ModuleCard selects variant-specific art.
- 59 assets, metadata, license, sizes and anchors: `public/assets/cozy-v1/README.md` and `manifest.json`.
- Original stage drawings are indicative illustrations, not botanically measured growth timelines. No actual six-crop growth logic or scientific sample scoring has been introduced. Optional animation is intentionally omitted.

Validation includes typecheck/build, existing simulation tests, browser checks of all six crops and sample-ready labels, scientific drawer expansion, loaded assets, and 1440px desktop overflow. UI and art still require A/B integration; no live Photon test or production deployment is claimed.

## Game-in-progress concept screenshot

`public/assets/previews/gameplay-mock-v1.html` composes the existing cozy assets into a 1600×1000 play-screen concept. The matching PNG is a browser screenshot of that HTML. It illustrates turn 4, selected greenhouse, resource telemetry, water warning, fuzzy forecast, crop journal and Mission Control. Values, meters, connectivity labels and selection are deliberately sample presentation data; no game action is performed. Reproduce HTML with `src/ui/preview/generate-gameplay.cjs`; create a new version for revisions rather than overwriting.

## Pixel v2 and livestock stages

The latest art review is `/assets/previews/pixel-elements-v5.html`; it preserves the earlier detailed variants and allows building/crop before-and-after comparison. New files are under `public/assets/pixel-v2`, with provenance, readiness notes and asset inventory in that directory's README. These are concept sheets: do not assume uniform building frame bounds or clean transparency on the sage-backed crops/animals.

`LivestockStageArt({animal, stage, size})` displays six lifecycle forms: chicken/pig/cow × juvenile/adult. It imports the existing AnimalKind contract; stage is a presentation-only input. Developer B must supply an authoritative maturity selector/field. Developer A still owns frame extraction, physical size, fixed-facing drag-only placement, ground anchors and depth order. No GameState change, growth threshold or simulation logic is implemented here.


## Unified delivery index

See `TEAM_HANDOFF.md` and `/assets/catalogue.html`; `public/assets/catalogue.json` records paths, measured image dimensions, readiness and provenance. Latest gameplay illustration is v3; continuous background v2; failure art is adult-only. B must supply authoritative wilted/dead state before binding these visual assets. All previous snapshots remain preserved.
