# agronaut

agronaut is a lunar agriculture design-space explorer. Players build an outpost, operate its shared utility network, grow food, survive hazards, and compare completed strategies. The desktop web app uses Next.js, TypeScript, Phaser 3, Supabase, and optional Photon Spectrum iMessage.

## Gameplay

- **Challenge:** build from an empty map and survive ten turns under high hazard pressure.
- **Progressive:** operate one inherited base through three ten-turn levels, with construction intermissions between levels.
- Agriculture has independent crop plots and livestock stalls. Parameters, care actions, and the two minigames affect production. A connected water recycler near a greenhouse improves water efficiency; nearby active livestock provides a small gameified recycling bonus.
- Integrated utility corridors carry power, water, and oxygen. Route length, integrity, capacity, demand, storage, thermal distance, shelters, multifunction utility allocations, and communication-tower backup affect survival.
- Modules retain the shared `rotation` field but have a fixed orientation in play. In a build phase, players can drag a disconnected module to move it, remove corridors, and reroute them. Operation locks the layout.
- Completed runs use a 70-point rules score plus a 30-point structured AI evaluation when available. A template report and normalized rules score keep results available when AI fails.

## Local development

Use Node.js 24. Run `npm ci`, copy `.env.example` to `.env.local`, then run `npm run dev`. The game and fallback report work without service credentials. `npm test`, `npm run typecheck`, and `npm run build` are the local checks.

The server accepts only an action transcript for `/api/runs`. It replays construction and every turn before computing scores or saving a result. Accepted actions and per-turn records are retained in `summary_json.replay` for future replay tooling. This prevents a client from submitting an arbitrary final score or resource state. Minigame modifiers are bounded to ±10% and require a move-by-move proof that the server replays to calculate the claimed bonus. This verifies that a score is achievable under the game rules; a browser client cannot prove that a human performed those moves, so competitive anti-cheat would still need an authoritative challenge service.

Saved runs with a transcript expose ordered state snapshots at `GET /api/replay/<runId>`. The first frame is the empty design state; subsequent frames follow accepted build and turn steps. Older runs without a stored transcript return 404.

## Database and deployment

Apply the files in `supabase/migrations` in numeric order to the target Supabase project. The service-role key stays on the server. `runs` is publicly readable for leaderboards and reports, while submission claims and Mission Control sessions use service-role-only operations. Submission claims permit five new runs per requester per day, plus a global ceiling of 100. A run ID is bound to its transcript hash. The same transcript reuses a cached result when saving fails; if the cache and run write both fail, one additional evaluation attempt is permitted after a two-minute lease expires. Claims remain to prevent an unlimited retry cycle.

Deploy through Vercel using the variables in `.env.example`. The existing Vercel project is **agronaut**. Set `NEXT_PUBLIC_SUPABASE_URL` to the HTTPS project URL, not a Postgres connection string. Keep `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and messaging secrets out of `NEXT_PUBLIC_*`. The [owner-shared deployment](https://agronaut-litigubqm-birch-yangs-projects.vercel.app/) has required Vercel Authentication; inspect the latest branch deployment in Vercel for external QA.

## Photon Mission Control

Photon uses curated contextual hints and the official Spectrum SDK. Its event messages, in-game questions, and iMessage replies never call OpenAI. Set `PHOTON_PROJECT_ID` to the Spectrum project ID and `PHOTON_API_KEY` to its project secret (`SECRET_KEY`), plus `PHOTON_WEBHOOK_SECRET`, `MISSION_SESSION_SECRET`, and the existing Supabase server credentials. Legacy `SPECTRUM_*` names remain supported.

Follow [the activation guide](docs/PHOTON.md) for recipient registration, webhook setup, SQL migrations, local setup, and the live send/reply check. Run `npm run photon:check` for a read-only configuration check. Both question channels share two attempts per active turn; automatic event notices retain a separate 25-message budget. Advice history is stored with the mission session and used by the report pipeline; recipient routing identifiers are encrypted. The game remains playable if Photon is unavailable.

## Scientific framing

Mission reports cite only IDs from the curated NASA/ESA source registry in `src/content/sources.ts`. These sources provide context for a simplified educational simulation. Large-animal lunar livestock is speculative. Aggregate player patterns describe this dataset and do not establish an optimal real lunar base or a causal effect.

## Current external verification limits

Earlier team work recorded an SDK connection, but this does not prove the current branch can deliver and receive messages in deployment. Apply all migrations and configure the branch deployment before checking real Photon send/reply behavior. The separate report/evaluation integration has its own optional model configuration. Public deployment and webhook access settings must also be checked.

## Current supply demo

Run `npm run demo` and open `/supply`. Run `npm run demo:script` for the matching Python simulation. Six crops share `src/data/crop-catalog.json`; the reference run produces 200 harvest points against a target of 180. Supply Lab and the ten-turn Mission page retain distinct resource models. See `docs/DEMO_SCRIPT.md` for the walkthrough.
