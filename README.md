# agronaut

agronaut is a lunar agriculture design-space explorer. The current app uses Next.js, TypeScript, and Supabase; the Phaser 3 renderer and Photon Spectrum integration are separate workstreams. Its central gameplay loop is design → operate → survive → produce → score → analyze.

## Local setup

1. Use Node.js 20.9 or newer (Node.js 24 recommended).
2. Run `npm install` and copy `.env.example` to `.env.local`.
3. Run `npm run dev` and open `http://localhost:3000`.

The landing page and fallback mission report work without credentials. Supabase reads/writes require its URL and keys. OpenAI-backed evaluation and reports require `OPENAI_API_KEY`. The Photon adapter is not connected yet, so adding Photon credentials alone will not activate Mission Control. Never commit `.env.local` or service keys.

## Deployment

Vercel project: **agronaut**. The owner-shared [deployment URL](https://agronaut-litigubqm-birch-yangs-projects.vercel.app/) currently requires Vercel Authentication; use Vercel Deployments to find the latest build for each branch. Keep `main` as the production branch and use `dev` for integration previews. Set the variables in `.env.example` in Vercel, with `NEXT_PUBLIC_SUPABASE_URL` set to the HTTPS Project URL (`https://<project-ref>.supabase.co`), not a Postgres connection string. Apply `supabase/migrations` to the Supabase project and verify database read/write. Set `NEXT_PUBLIC_APP_URL` to the chosen deployment origin when needed. Keep server keys only in server environment variables, never in `NEXT_PUBLIC_*` variables.

## Team boundaries

- Developer A owns `src/game/phaser`, `src/game/minigames`, and renderer interactions.
- Developer B owns `src/game/state`, `src/game/simulation`, `src/backend`, `src/ai`, and backend routes.
- Designer/content owns final copy, art, source curation, and visual polish.

`src/game/state/types.ts` is the initial shared renderer/simulation contract. Coordinate changes before editing it. The `/game` page is currently a renderer placeholder.

## Team progress (2026-09-25, America/Chicago)

| Workstream | Branch / status | Integration note |
| --- | --- | --- |
| Project setup + Developer B | `chore/agronaut-branding` merged into `dev` at `7b9d7af` | The official project name is `agronaut` across the package, landing page, browser title, share title, and docs. The typed simulation, Supabase APIs, AI fallbacks, and CI remain available. |
| Developer A | Separate branch; this branch does not touch Phaser or minigames | Mount the renderer in `/game`; consume `src/game/state/types.ts` and `src/game/state/reducer.ts`. |
| Designer/content | Separate branch; this branch does not add art or source claims | Provide verified sources for `src/ai/sourceAdapter.ts` and final copy/assets. |

PR #1 was merged into `main` at `af188a6` although the planned target was `dev`; `dev` was then synchronized. The `agronaut` naming branch was pushed separately and merged into `dev` at `7b9d7af`. Future feature PRs should target `dev`; release PRs can move tested changes from `dev` to `main`. Before editing the shared state/action contract, coordinate the exact change with the other workstreams. Next integration tasks: apply and verify the `runs` migration, connect the renderer and verified source registry, then complete the Photon adapter. A local read of `public.runs` returned `PGRST205` on 2026-09-25, so database setup still needs verification. Public OpenAI-backed run submission needs rate limiting and server-side validation before an unrestricted release.

### Developer B agriculture slot handoff (2026-09-26)

Feature branch `feat/agriculture-slots` is pushed for review in [draft PR #3](https://github.com/Birch-Yang/SpaceAgriculture/pull/3), targeting `dev`; implementation commit `69b58e1`, baseline and handoff commit `1065504`. The exact shared contract and A-owned build blocker were posted in the PR discussion for both teammates. Keep `main` unchanged while the build blocker is fixed.

The `feat/agriculture-slots` workstream adds independent crop plots and livestock stalls to the existing resolver. Greenhouse and livestock capacities 1/2/3 now create exactly that many records, indexed from 0. Slot 0 starts with lettuce or chicken; other slots start empty. `CropPlotState.crop` and `LivestockState.animal` can be `null`; new fields are `slotIndex`, `wateredThisCycle`, `fedThisCycle`, and `feedMinigameModifier`. Existing agricultural actions accept optional `slotIndex` (default 0). New actions are `WATER_PLOT` and `FEED_STALL`; `HARVEST_CROP`, `FEED_STALL`, and `REPAIR` accept optional `minigameModifier`. `PLACE_MODULE.rotation` remains in the type for compatibility; the game controls use rotation 0.

The resolver owns all slot validation, AP, care resources, growth, output, and scoring. Watering spends 1 water, feeding spends 1 food, each at most once per slot cycle. Care multiplies that slot's next output by 1.1; a finite minigame modifier is clamped to ±0.1. Module `baseYield` is split into integer shares by slot index. Existing extra water, power, and feed use is divided by capacity and charged only for occupied slots. Turn history names the module and slot for each crop or meat output. Empty slots are excluded from aggregate crop and animal mix.

**Developer A integration:** After this branch reaches `dev`, update `src/game/phaser/agricultureAdapter.ts` to consume the concrete slot fields directly and remove its temporary casts. Update A-owned adapter tests that still expect a standard greenhouse to have only one record. Do not calculate care or yield in Phaser; dispatch the actions above and render the returned `GameState`. The existing `/game` renderer was merged into `dev` in PR #2 before this B branch began.

**Integration status:** `npm test` (6 tests) and `npm run typecheck` pass on the B branch. The production build is blocked by the pre-existing A-owned `src/game/phaser/game.module.css:89` selector `:global(.minigamePanel)`, which Next.js rejects as an impure CSS module selector. Developer A should fix that selector in their workstream and rerun `npm run build`; B does not edit Phaser files. The isolated worktree also needs locally installed dependencies for Turbopack (a junction outside its root is rejected), but Vercel's normal checkout installs dependencies within its project root.

## Checks

Run `npm test` for the small baseline: deterministic turn replay, one-turn crisis recovery, 1/2/3 slot initialization, slot care and rejection, bounded modifiers, and a ten-turn Challenge run with connected power/water/oxygen plus crop and meat production. It uses Node's built-in test runner and requires Node.js 24; no external test package is needed.

Before merging to `dev`, also run `npm run typecheck` and `npm run build`. All three commands passed with Node.js 24 for the `agronaut` naming branch; the built `<title>`, `<h1>`, and Open Graph title were verified. The owner-shared deployment URL requires Vercel login; share access through Vercel when an external reviewer needs it. Vercel environment variables cannot be verified from this repository.

## Integration

The renderer imports `GameState`, `PlayerAction`, and `TurnResult` from `src/game/state/types.ts`. Create a run with `createInitialState`, apply design actions with `applyBuildAction`, call `startOperation`, then call `resolveTurn(state, actions, rngSeed)` for each turn. The renderer must treat the returned state as authoritative and must not calculate resource production or hazards itself. Agriculture modules initialize slot 0 with the default occupant and leave the other slots empty for player choice.

The content teammate should provide the verified scientific source registry. `src/ai/sourceAdapter.ts` is intentionally empty until that registry is ready, so reports cite no external sources yet. The Photon adapter in `src/ai/photon.ts` is also a local boundary pending a provisioned Spectrum project and provider choice. These are integration tasks, not simulated live integrations.
