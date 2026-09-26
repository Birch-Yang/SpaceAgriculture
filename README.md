# agronaut

agronaut is a lunar agriculture design-space explorer. Players build an outpost, operate its shared utility network, grow food, survive hazards, and compare completed strategies. The desktop web app uses Next.js, TypeScript, Phaser 3, Supabase, and optional Photon Spectrum iMessage.

## Gameplay

- **Challenge:** build from an empty map and survive ten turns under high hazard pressure.
- **Progressive:** operate one inherited base through three ten-turn levels, with construction intermissions between levels.
- The official mission at `/game` supports lettuce, radish, chili pepper, potato, soybean, and research-only Arabidopsis. The old `/supply` URL redirects to this mission; the separate Supply Lab was removed.
- Agriculture has independent crop plots and livestock stalls. Parameters, care actions, and the two minigames affect production. A connected water recycler near a greenhouse improves water efficiency; nearby active livestock provides a small gameified recycling bonus.
- Integrated utility corridors carry power, water, and oxygen. Route length, integrity, capacity, demand, storage, thermal distance, shelters, multifunction utility allocations, and communication-tower backup affect survival.
- Modules retain the shared `rotation` field but have a fixed orientation in play. In a build phase, players can drag a disconnected module to move it, remove corridors, and reroute them. Operation locks the layout.
- Completed runs use a 70-point rules score plus a 30-point structured AI evaluation when available. A template report and normalized rules score keep results available when AI fails.

## Local development

Use Node.js 24. Run `npm ci`, copy `.env.example` to `.env.local`, then run `npm run dev`. The game and fallback report work without service credentials. `npm test`, `npm run typecheck`, and `npm run build` are the local checks.

The server accepts only an action transcript for `/api/runs`. It replays construction and every turn before computing scores or saving a result. Accepted actions and per-turn records are retained in `summary_json.replay` for future replay tooling. This prevents a client from submitting an arbitrary final score or resource state. Minigame modifiers are bounded to ±10% and require a move-by-move proof that the server replays to calculate the claimed bonus. This verifies that a score is achievable under the game rules; a browser client cannot prove that a human performed those moves, so competitive anti-cheat would still need an authoritative challenge service.

Saved runs with a transcript expose ordered state snapshots at `GET /api/replay/<runId>`. The first frame is the empty design state; subsequent frames follow accepted build and turn steps. Older runs without a stored transcript return 404.

## Database and deployment

Apply the files in `supabase/migrations` in numeric order to the target Supabase project. The secret key stays on the server. `runs` is publicly readable for leaderboards and reports, while submission claims and Mission Control sessions use server-only operations. Submission claims permit five new runs per requester per day, plus a global ceiling of 100. A run ID is bound to its transcript hash. The same transcript reuses a cached result when saving fails; if the cache and run write both fail, one additional evaluation attempt is permitted after a two-minute lease expires. Claims remain to prevent an unlimited retry cycle. Follow [Records and Supabase setup](docs/SUPABASE_RECORDS_SETUP.md) to activate persistence and Player Rank.

Deploy through Vercel using the variables in `.env.example`. The existing Vercel project is **agronaut**. Set `NEXT_PUBLIC_SUPABASE_URL` to the HTTPS project URL, not a Postgres connection string. Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and keep `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, and messaging secrets out of `NEXT_PUBLIC_*`. Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain supported. The [owner-shared deployment](https://agronaut-litigubqm-birch-yangs-projects.vercel.app/) has required Vercel Authentication; inspect the latest branch deployment in Vercel for external QA.

## Optional Mission Control iMessage

Set `SPECTRUM_PROJECT_ID` (or legacy `PHOTON_PROJECT_ID`), `SPECTRUM_PROJECT_SECRET`, `SPECTRUM_WEBHOOK_SECRET`, and a random `MISSION_SESSION_SECRET` of at least 32 characters. Set a separate `SUBMISSION_HASH_SECRET` for request-quota hashes. Register a Photon Spectrum webhook at `https://<deployment-origin>/api/mission-control/webhook` for inbound message events and copy its signing secret into `SPECTRUM_WEBHOOK_SECRET`. See [Photon's iMessage routing](https://photon.codes/docs/spectrum-ts/providers/imessage/connection-and-routing) and [webhook signature format](https://photon.codes/docs/webhooks/verifying-signatures).

The player may enter an iMessage address voluntarily. The address and conversation ID are encrypted in a two-hour session and are never stored in `runs`. A short-lived token authorizes turn updates; signed inbound webhooks are deduplicated. The advisor sees only coarse telemetry, sends advice, and cannot change game state. Enrollment is limited to three sessions per requester per day, globally 100, and each session sends at most 25 advice messages. Service or communication failure leaves the game playable with an explicit unavailable or offline state. During a communications hazard, a connected tower strengthens a connected multifunction utility's backup allocation. `cleanup_mission_control()` removes expired sessions and dedupe rows on subsequent traffic; schedule it separately if expiry must happen during quiet periods.

## Scientific framing

Mission reports cite only IDs from the curated NASA/ESA source registry in `src/content/sources.ts`. These sources provide context for a simplified educational simulation. Large-animal lunar livestock is speculative. Aggregate player patterns describe this dataset and do not establish an optimal real lunar base or a causal effect.

## Current external verification limits

The Photon project credential supplied during development established an SDK connection locally, without being written to this repository. The project still needs its SQL migrations applied and deployment variables configured before live persistence, OpenAI, or iMessage send/receive can be verified. A production URL also needs access settings reviewed for public play. No branch is merged by this worktree.

## Acceptance scope

The [current six-crop acceptance standard](docs/ACCEPTANCE_SIX_CROPS.md) defines the one ranked design–operation–settlement loop. `/supply` redirects to `/game`; former 12-turn Supply Lab metrics are not part of mission scoring or records.
