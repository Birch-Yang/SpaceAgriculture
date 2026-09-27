# Ruleset v3 interaction demo — presentation handoff

Preview: `public/assets/previews/ruleset-v3-interaction-demo-v1.html` on branch `feat/ruleset-v3-demo-2026-09-26`, based on `origin/main` at `df44a49`. The original HTML previews are unchanged.

This is a standalone, local HTML/CSS/JavaScript **interaction mock**. It does not import GameState, submit runs, call Photon or Supabase, calculate official scores, or modify the Phaser world. The displayed costs, resource deltas, crop growth, hazard sequence and 220-material label are illustrative proposals; they are not production balance values. No shared interface changed.

Demo path:

1. Start with a fuzzy forecast; select **Reveal this turn** to show the current incident and an approximate target marker.
2. Open **Emergency** and choose one prepared or temporary response. Switching a response replaces the prior queued choice without spending anything. Limited water/oxygen/food caches can also be queued.
3. Open **Greenhouse**. Water or inspect an individual bed; plant one of the existing six crops by selecting a packet and clicking an empty bed. Drag-and-drop is included with a click/keyboard fallback. Once a bed is ready, harvest it.
4. Review projected AP/resources and cancel queued actions if desired. **End Turn** applies the local example model and gives three short statements: what happened, why, and what to do next.
5. **Next turn** cycles through temperature, radiation, impact, communications, and power examples. Communications loss leaves local operation available; battery discharge uses tracked example charge.

Artwork is reused from `public/assets/previews/gameplay-concept-v3.png` and `public/assets/cozy-v1/` (manifest lists CC0 presentation assets). The scene image is illustrative; target markers are approximate positions, not authoritative grid coordinates. Developer A owns future world and simulation integration, Developer B owns authoritative state/replay/backend versioning, and Developer C can reuse the visual and interaction components after contracts are agreed. The real v3 build must never use this mock's local settlement code for scoring or replay.

Verification: browser walkthrough of reveal, response cost, bed watering and planting, settlement summary, and turn advance; `node --check` on the embedded script; `npm run typecheck`, `npm run build`, and `npm test`. No source files outside this presentation preview and handoff note were edited.
