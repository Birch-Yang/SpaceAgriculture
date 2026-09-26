# SpaceAgriculture

Lunar Agriculture Design-Space Explorer is a desktop web project built with Next.js, TypeScript, Phaser 3, Supabase, and Photon Spectrum. Its central gameplay loop is design → operate → survive → produce → score → analyze.

## Local setup

1. Use Node.js 20.9 or newer (Node.js 24 recommended).
2. Run `npm install` and copy `.env.example` to `.env.local`.
3. Run `npm run dev` and open `http://localhost:3000`.

The landing page works without credentials. Supabase, Photon, and report generation require their environment variables. Never commit `.env.local` or service keys.

## Deployment

Import this repository into Vercel as a Next.js project. Set the variables listed in `.env.example` in Vercel. Apply `supabase/migrations` to the Supabase project, then configure the public URL in `NEXT_PUBLIC_APP_URL`. Configure Vercel to deploy `dev` for integration previews; keep `main` as the production branch. Verify both the landing page and database read/write after provisioning.

## Team boundaries

- Developer A owns `src/game/phaser`, `src/game/minigames`, and renderer interactions.
- Developer B owns `src/game/state`, `src/game/simulation`, `src/backend`, `src/ai`, and backend routes.
- Designer/content owns final copy, art, source curation, and visual polish.

`src/game/state/types.ts` is the initial shared renderer/simulation contract. Coordinate changes before editing it. The `/game` page is currently a renderer placeholder.

## Checks

Run `npm test` for the small baseline: deterministic turn replay, one-turn crisis recovery, and a ten-turn Challenge run with connected power/water/oxygen plus crop and meat production. It uses Node's built-in test runner and requires Node.js 24; no external test package is needed.

Before merging to `dev`, also run `npm run typecheck` and `npm run build`. In the current workspace, the baseline test passes; dependency installation, typecheck, and build are still unverified because the configured proxy at `127.0.0.1:7897` refuses connections. A public Vercel URL and Supabase credentials have not yet been provisioned.
