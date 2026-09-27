# Full hazard turn preview — V5 handoff

Preview: `public/assets/previews/ruleset-v3-interaction-demo-v5.html` (served from `/assets/previews/ruleset-v3-interaction-demo-v5.html`). V1–V4 and the original gameplay/UI HTML previews are preserved.

## Walkthrough

1. Start on the outpost in locked-layout operation mode. Select a labelled greenhouse, livestock, utility, or battery structure to inspect it in the mission rail. The greenhouse and livestock modules open their interior controls.
2. Read the fuzzy forecast and select **Reveal this turn**. The incident's affected site appears on the map with a hazard-specific icon.
3. Click the flashing site marker, inspect its location-specific response choices, and select one. The AP and resource projection and queue update immediately. The response can be cancelled or changed before settlement.
4. Use the right-side per-turn rail to open greenhouse care, livestock care, or the emergency console. Greenhouse tools demonstrate seed selection/dragging, watering, inspection, harvest, and water/light/temperature settings. Livestock stalls demonstrate animal choice, feed level, and manual feeding. Selecting a map utility module permits a thermal allocation action; damaged selected modules offer repair. Each queued action appears with its AP projection and can be cancelled.
5. Select **End Turn** to see the local illustrative resource and production changes, the four-line result (event, cause, production, next step), and a centered, flashing, fuzzy warning for the following turn. Dismiss the warning, then select **Next turn** to repeat the loop. The five hazard examples cycle through thermal, solar, impact, communications, and power incidents.

The art reuses `gameplay-concept-v3.png`, the existing crop and animal SVGs under `public/assets/cozy-v1/`, and the V2 hazard icons under `public/assets/previews/ruleset-v3-icons/`. No source art was modified. The map's painted sidebar is cropped out; all visible controls are live HTML.

## Production boundary

The preview combines **current control types** (operation-mode layout lock, selected-module inspection, greenhouse environment settings, animal/feed settings, utility allocation and repair, AP queue, End Turn) with a **proposed ruleset flow** (hazard revelation before action and same-turn location response). Current production still resolves hazards at End Turn and uses its existing GameState/ruleset. This HTML is an isolated local state machine and must not be treated as production simulation, balance, scoring, or a data contract.

Its starting turn 4 example uses 5 AP, 54 material, 28 Power, 40 Water, 40 Oxygen, 26 Food, 20°C, crop total 28, meat total 12, and two active animal stalls. Response effects, bed moisture/health, stall progress, +2 example meat from feeding, repair +20 integrity, and resource cache values are **mock presentation values** only. They do not change game balance parameters or migrate to another branch.

To integrate later, Developer B/engine owners would need to expose authoritative current incident and affected world coordinate, valid response choices with availability and costs, queued action projection, greenhouse plot state and environment settings, livestock stall state, selected-module integrity and actions, settlement reasons, and next-turn fuzzy risk. Developer C can consume those fields in React when contracts are agreed; this demo changes no shared interface, GameState type, resolver, Phaser world, Photon backend, Supabase logic, or production page.

Verification: full browser walkthrough from forecast through next turn, greenhouse and livestock controls, action queue/cancellation, hazard response, post-turn warning; JavaScript syntax; `npm run typecheck`, `npm run build`, and `npm test`.
