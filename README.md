# SpaceAgriculture

Lunar Agriculture Design-Space Explorer is a desktop web project built with Next.js, TypeScript, Phaser 3, Supabase, and Photon Spectrum. Its central gameplay loop is design → operate → survive → produce → score → analyze.

## Local setup

1. Use Node.js 20.9 or newer (Node.js 24 recommended).
2. Run `npm install` and copy `.env.example` to `.env.local`.
3. Run `npm run dev` and open `http://localhost:3000`.

The landing page and fallback mission report work without credentials. Supabase reads/writes require its URL and keys. OpenAI-backed evaluation and reports require `OPENAI_API_KEY`. The Photon adapter is not connected yet, so adding Photon credentials alone will not activate Mission Control. Never commit `.env.local` or service keys.

## Deployment

Import this repository into Vercel as a Next.js project. Apply `supabase/migrations` to the Supabase project and set the required variables from `.env.example` in Vercel. Keep `main` as the production branch and use `dev` for integration previews. Set `NEXT_PUBLIC_APP_URL` to the deployed site's origin when its URL is known. Verify the landing page and database read/write after provisioning. Keep server keys only in server environment variables, never in `NEXT_PUBLIC_*` variables.

## Team boundaries

- Developer A owns `src/game/phaser`, `src/game/minigames`, and renderer interactions.
- Developer B owns `src/game/state`, `src/game/simulation`, `src/backend`, `src/ai`, and backend routes.
- Designer/content owns final copy, art, source curation, and visual polish.

`src/game/state/types.ts` is the initial shared renderer/simulation contract. Coordinate changes before editing it. The `/game` page is currently a renderer placeholder.

## Team progress (2026-09-25, America/Chicago)

| Workstream | Branch / status | Integration note |
| --- | --- | --- |
| Project setup + Developer B | PR #1 merged into `main`; the same commit was synchronized to `dev` | Next.js shell, typed state/actions, deterministic simulation, Supabase migration/APIs, AI fallbacks, and CI are available on the integration branch. |
| Developer A | Separate branch; this branch does not touch Phaser or minigames | Mount the renderer in `/game`; consume `src/game/state/types.ts` and `src/game/state/reducer.ts`. |
| Designer/content | Separate branch; this branch does not add art or source claims | Provide verified sources for `src/ai/sourceAdapter.ts` and final copy/assets. |

PR #1 was merged into `main` at `af188a6` although the planned target was `dev`. `dev` was fast-forwarded to that exact commit so teammates can base new work on `dev`. Future feature PRs should target `dev`; release PRs can then move tested changes from `dev` to `main`. Before editing the shared state/action contract, coordinate the exact change with the other workstreams. Next integration tasks: provision Supabase and apply the migration, deploy a `dev` preview, then connect the renderer and verified source registry. OpenAI and Photon can remain unconfigured while the baseline is tested.

## Checks

Run `npm test` for the small baseline: deterministic turn replay, one-turn crisis recovery, and a ten-turn Challenge run with connected power/water/oxygen plus crop and meat production. It uses Node's built-in test runner and requires Node.js 24; no external test package is needed.

Before merging to `dev`, also run `npm run typecheck` and `npm run build`. On the initial Developer B branch, all three commands passed with Node.js 24. GitHub pushes worked after bypassing the unavailable local proxy. A public Vercel URL and Supabase credentials have not yet been provisioned.

## Integration

The renderer imports `GameState`, `PlayerAction`, and `TurnResult` from `src/game/state/types.ts`. Create a run with `createInitialState`, apply design actions with `applyBuildAction`, call `startOperation`, then call `resolveTurn(state, actions, rngSeed)` for each turn. The renderer must treat the returned state as authoritative and must not calculate resource production or hazards itself. Crop and animal modules are initialized with default occupants; operation actions change their settings. Developer A can render the current state while its Phaser integration and minigames are built.

The content teammate should provide the verified scientific source registry. `src/ai/sourceAdapter.ts` is intentionally empty until that registry is ready, so reports cite no external sources yet. The Photon adapter in `src/ai/photon.ts` is also a local boundary pending a provisioned Spectrum project and provider choice. These are integration tasks, not simulated live integrations.
