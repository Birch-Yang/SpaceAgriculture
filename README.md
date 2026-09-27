# Agronaut

**Build a lunar farm where every harvest depends on the systems keeping it alive.**

[Play the game](https://agronaut.vercel.app/game) · [Explore Records](https://agronaut.vercel.app/leaderboard) · [View Player Patterns](https://agronaut.vercel.app/analytics)

Agronaut is a playable lunar agriculture design space. Players build an outpost, connect its life support systems, grow food, respond to hazards, and see how their decisions shape the mission. Completed runs become replayable records and help surface layout and strategy ideas for further exploration.

The web app is built with Next.js, TypeScript, and Phaser 3, with Supabase for saved runs and optional OpenAI and Photon integrations.

## How to play

1. **Choose a mission.** Enter a nickname and select Challenge or Progressive mode. An iMessage number is optional for players who want to contact Photon, the in-game Earth liaison.
2. **Design the base.** Place modules within the construction budget and connect them with utility corridors.
3. **Run the mission.** Manage agriculture and shared resources as conditions change and hazards appear. Photon can offer limited hints without making decisions for you.
4. **Review the outcome.** Read the mission report, replay the saved actions, compare results in Records, and explore broader trends in Player Patterns.

The game is playable without a phone number. Photon iMessage delivery depends on the configured project and, on Free/Pro plans, an allowlisted recipient.

## Run locally

Install **Node.js 24** and npm, then run:

```bash
git clone https://github.com/Birch-Yang/SpaceAgriculture.git
cd SpaceAgriculture
npm ci
npm run dev
```

Open [http://localhost:3000/game](http://localhost:3000/game). A local mission and rule-based report work without service credentials. To enable saved Records, AI evaluation, or Photon, copy `.env.example` to `.env.local`, configure the relevant keys, and apply the [Supabase setup guide](docs/SUPABASE_RECORDS_SETUP.md). Keep `.env.local` out of Git.

Check the project with:

```bash
npm test
npm run typecheck
npm run build
```

## Project structure

| Path | Purpose |
| --- | --- |
| `app/` | Pages and server API routes |
| `src/game/` | Mission state, simulation, scoring, and Phaser game client |
| `src/ui/` | Onboarding, reports, Records, replay, and Player Patterns |
| `src/ai/` | Photon advice, strategy assessment, and mission reports |
| `src/backend/` | Supabase persistence and mission sessions |
| `supabase/migrations/` | Database schema and server-side submission controls |
| `docs/` | Setup notes, scientific sources, and acceptance criteria |

## Technical Progress

The sections below document the current implementation, deployment setup, and verification status.

### Gameplay and simulation

- **Challenge:** build from an empty map and survive ten turns under high hazard pressure.
- **Progressive:** operate one inherited base through three ten-turn levels, with construction intermissions between levels.
- The official mission at `/game` supports lettuce, radish, chili pepper, potato, soybean, and research-only Arabidopsis. The old `/supply` URL redirects to this mission; the separate Supply Lab was removed.
- Agriculture has independent crop plots and livestock stalls. Parameters, care actions, and the two minigames affect production. A connected water recycler near a greenhouse improves water efficiency; nearby active livestock provides a small gameified recycling bonus.
- Integrated utility corridors carry power, water, and oxygen. Corridors can cross, share cells, and form T-junctions with existing paths; orthogonally touching corridor cells connect, while diagonal contact does not. Construction charges only newly occupied cells, and shared cells share flow capacity. Route length, integrity, capacity, demand, storage, thermal distance, shelters, multifunction utility allocations, and communication-tower backup affect survival.
- Modules retain the shared `rotation` field but have a fixed orientation in play. In a build phase, players can drag a disconnected module to move it, remove corridors, and reroute them. Operation locks the layout.
- Completed runs use a 70-point rules score plus a 30-point structured AI evaluation when available. A template report and normalized rules score keep results available when AI fails.

### Server-verified runs and replays

- `/api/runs` accepts an action transcript, replays construction and every turn, then computes the score before saving. It does not trust a client-submitted final score or resource state.
- Accepted actions and per-turn records are stored in `summary_json.replay`. `GET /api/replay/<runId>` returns ordered snapshots from the empty design state through each accepted step. Older runs without a transcript return 404.
- Minigame modifiers are capped at ±10% and require a move-by-move proof that the server replays. This verifies that the claimed score is achievable under the game rules; proving that a human performed the moves would require an authoritative challenge service.

### Database and deployment

- Apply `supabase/migrations` in numeric order. The `runs` table is publicly readable for Records and reports; submission claims and Mission Control sessions use server-only operations. Follow [Records and Supabase setup](docs/SUPABASE_RECORDS_SETUP.md) to enable persistence and Player Rank.
- Submission claims allow five new runs per requester per day, with a global ceiling of 100. Each run ID is bound to its transcript hash. Failed saves can reuse a cached evaluation; claims and a timed lease limit repeat evaluations.
- The Vercel project is **agronaut**. Configure it with `.env.example`: `NEXT_PUBLIC_SUPABASE_URL` must be the HTTPS project URL, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is public. Keep `SUPABASE_SECRET_KEY`, `OPENAI_API_KEY`, and messaging secrets server-side. Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are also supported.

### Optional Mission Control iMessage

- Apply migration `202609260005_photon_turn_questions.sql`. Configure `SPECTRUM_PROJECT_ID` (or legacy `PHOTON_PROJECT_ID`), `SPECTRUM_PROJECT_SECRET`, `SPECTRUM_WEBHOOK_SECRET`, a random `MISSION_SESSION_SECRET` of at least 32 characters, and a separate `SUBMISSION_HASH_SECRET` for request-quota hashes.
- Register a Photon Spectrum webhook at `https://<deployment-origin>/api/mission-control/webhook` for inbound events. Put that webhook's own signing secret in the receiving deployment's `SPECTRUM_WEBHOOK_SECRET`. See [Photon's iMessage routing](https://photon.codes/docs/spectrum-ts/providers/imessage/connection-and-routing) and [webhook signature format](https://photon.codes/docs/webhooks/verifying-signatures).
- The current Photon project routes replies through the `codex/photon-turn-relay` Vercel preview endpoint. Its secret is kept locally as `SPECTRUM_PREVIEW_WEBHOOK_SECRET`, while the receiving deployment uses the runtime name `SPECTRUM_WEBHOOK_SECRET`. The public site and preview share Supabase sessions and must use the same `MISSION_SESSION_SECRET`. Keep the preview endpoint available. Registering a different webhook creates a different signing secret, even when it points to the same project.
- Players can optionally enter an iMessage-enabled number. Free/Pro projects require recipients in Photon's **Users** list. The opening transmission arrives at mission start; Photon offers up to two hints per turn, then sends a weak-signal notice. Hazard alerts are intentionally imprecise. The advisor receives coarse telemetry, cannot change game state, and does not give direct solutions.
- Phone numbers and conversation IDs are encrypted in two-hour sessions, never stored in `runs`. Short-lived tokens protect turn updates and status reads; signed inbound webhooks are deduplicated. Failed or uncertain replies still consume the reserved question attempt. Enrollment is capped at three sessions per requester per day and 100 globally; each session allows at most 100 outbound advisor messages. If messaging fails, the game remains playable. `cleanup_mission_control()` removes expired sessions and dedupe rows on later traffic.

### Scientific framing

Mission reports cite only IDs from the curated NASA/ESA source registry in `src/content/sources.ts`. These sources provide context for a simplified educational simulation. Large-animal lunar livestock is speculative. Aggregate player patterns describe this dataset and do not establish an optimal real lunar base or a causal effect.

### External verification

- On 2026-09-26, the owner applied Supabase migrations 002–005. A production build submitted a replayable ten-turn QA run and verified all five ranking categories, its report, Player Patterns, and replay frames. The QA run and its claim were removed afterward.
- From the public game page, an allowlisted iPhone received Photon's opening, two hints, the third-question weak-signal notice, and a later disaster warning. Signed inbound messages were recorded and deduplicated; a separate session check confirmed the two-question allowance resets on the next turn.
- The public-page iMessage flow uses the shared preview webhook described above. A communications outage has simulation coverage but has not been observed on a live iPhone.

### Acceptance scope

The [current six-crop acceptance standard](docs/ACCEPTANCE_SIX_CROPS.md) defines the one ranked design–operation–settlement loop. `/supply` redirects to `/game`; former 12-turn Supply Lab metrics are not part of mission scoring or records.
