# Non-UI gap audit against the original hackathon specification

Status reflects the `codex/non-ui-completion` branch based on `dev` as of 2026-09-26. The original specification is a requirements reference. The later product decision to keep buildings in a fixed orientation supersedes its rotation requirement; the state field remains for compatibility.

| Priority | Requirement | State on original `dev` | State on this branch |
| --- | --- | --- | --- |
| 1 | End-to-end result submission | Game completion did not call the submission API; results, reports, and rankings were disconnected. | The client submits an action transcript; the server replays it, scores, builds a report, caches it, and saves it. The result appears in the game, with a retry path and a saved-report link. |
| 1 | Authoritative result and AI cost control | A caller could submit arbitrary completed state; no durable claim gate limited duplicate AI calls. | Strict transcript parsing and replay reject forged final state. A database claim binds the run ID to a transcript hash and limits requests per requester and globally. |
| 1 | Multi-slot agriculture | Only the first crop plot or livestock stall participated in the simulation. | Every module slot participates. Planting, harvesting, animal selection, watering, feeding, and parameter updates act on independent slots. Minigame modifiers are bounded. |
| 1 | Minigame failure fallback | A minigame chunk or component failure could interrupt a player action. | Minigames load on demand inside an error boundary. If loading or rendering fails, the action can continue with a neutral modifier. |
| 1 | Integrated utility graph and survival systems | Disconnected supply and capacity bottlenecks did not consistently affect resources. Storage and some module effects were inert. | Graph collection/delivery accounts for capacity, distance, and integrity; storage caps, water proximity, thermal distance, utility backup power, communication-tower backup, shelter protection, and a small recreation AP bonus are active. |
| 1 | Ten- and thirty-turn progression | Full Challenge/Progressive paths were not covered end to end. | Tests cover deterministic ten-turn and thirty-turn completion, crisis recovery, and level inheritance; per-turn records are retained. Each level uses one stable hazard seed so its total pressure budget is comparable across runs. |
| 2 | Intermission changes | Modules could be placed and removed, but existing modules and corridors could not be rerouted. | Disconnected modules can be moved for construction cost; corridors can be removed and rebuilt. Connected modules must be disconnected first. |
| 2 | Scientific reporting | The curated NASA/ESA registry existed, but reports did not receive it. | AI citations are filtered to registry IDs. The deterministic fallback report also cites registry entries. |
| 2 | Five leaderboards and aggregate analytics | Backend/API/UI existed, but completed runs were never saved from game play. Analytics were limited to basic counts. | Submission populates existing leaderboard categories. Analytics now include network connectivity, actual protective budget share, crop settings, per-greenhouse yield, and observations among the top quartile of scored runs. |
| 2 | Photon Mission Control | A local adapter existed without a real transport. | Optional Photon Spectrum iMessage enrollment, outbound events, signed/deduplicated inbound replies, coarse telemetry, encrypted short-lived sessions, quotas, and unavailable/offline states are implemented. |
| 3 | Replay data and agricultural loop | Final rows did not retain action-level replay data. | Saved summaries include the transcript and per-turn records. Nearby active livestock can give a small, clearly gameified greenhouse recycling bonus. |

## Verification completed locally

`npm test`, `npm run typecheck`, and `npm run build` pass. Tests exercise deterministic replay, forged action rejection, network bottlenecks, storage, fixed orientation, intermission rerouting, AP recovery, crisis handling, thirty-turn inheritance, and webhook signature checking. All nine curated NASA/ESA URLs were reachable when checked on 2026-09-26.

## Remaining verification or product work

- **External configuration:** The SQL migrations have not been applied to the shared Supabase project. The deployed branch needs its server variables and public access settings configured and checked. The supplied Photon project secret established an SDK connection locally, but the webhook signing secret, recipient enrollment, and deployed callback are not configured here. Real iMessage send/receive and webhook delivery have not been exercised.
- **Browser minigame provenance:** The server bounds submitted modifiers to ±10%, but a browser cannot prove that the human played a minigame. A competitive leaderboard would require authoritative minigame challenge issuance and result verification.
- **Production QA:** Public Vercel access, Supabase read/write, OpenAI response behavior, and the whole browser journey need checks after deployment. The local build does not prove those external services are configured.
- **Visual/UI scope:** Map animation, visual feedback, asset polish, and other visual design items from the original specification are outside this branch's authorized scope. A saved replay viewer and third minigame are optional stretch features, while replay data is already stored.

Do not claim that player results establish an optimal real lunar base. The analytics are descriptive, and large-animal lunar livestock remains speculative.
