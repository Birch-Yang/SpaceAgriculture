# Ruleset v3 warning interaction demo — V2 handoff

Preview: `public/assets/previews/ruleset-v3-interaction-demo-v2.html`. V1 and all earlier HTML previews remain unchanged. This branch contains a standalone presentation prototype; it does not change Phaser, GameState, hazard resolution, scoring, Photon, Supabase, or production pages.

## Interaction flow

1. Reveal the current event, select an emergency response, and optionally care for individual greenhouse beds.
2. End Turn applies local illustrative outcomes and displays a centered, briefly flashing **next-turn risk** card. This appears only after settlement. Its icon and wording identify a broad risk category; the exact event and target remain hidden.
3. Acknowledge the card to review the three-line turn summary. Select Next turn, then reveal the new event and respond within that turn.
4. The Emergency panel's icon guide previews all five signals without changing the game state. Repeated play cycles through the five existing hazard categories.

The UI also supports response cancellation, projected AP/resource costs, greenhouse planting/watering/inspection/harvest, supply caches, and keyboard bed activation. Animations stop under `prefers-reduced-motion`.

## New icon assets

All five are original 64 × 64 SVG pixel icons with transparent backgrounds and `shape-rendering="crispEdges"`. They are presentation assets, not final Phaser sprites.

| File | Meaning | Presentation use | Status / source |
| --- | --- | --- | --- |
| `public/assets/previews/ruleset-v3-icons/temperature.svg` | Thermal volatility | Warning, incident, map marker, guide | Demo-ready; drawn for this prototype |
| `public/assets/previews/ruleset-v3-icons/radiation.svg` | Solar particle exposure | Same | Demo-ready; drawn for this prototype |
| `public/assets/previews/ruleset-v3-icons/micrometeoroid.svg` | Impact risk | Same | Demo-ready; drawn for this prototype |
| `public/assets/previews/ruleset-v3-icons/communications.svg` | Communication interruption | Same | Demo-ready; drawn for this prototype |
| `public/assets/previews/ruleset-v3-icons/power.svg` | Power shortage | Same | Demo-ready; drawn for this prototype |

The preexisting outpost image and crop sprites are reused. The warning sequence, values, action effects, and crop progression remain local mock data. Developer A owns world and resolver integration; Developer B owns authoritative event and resource state. React integration would need the resolved-turn summary and a **fuzzy next-turn risk category** from selectors; the UI must not infer that risk from a future event table. No shared contract was changed here.

Verification: embedded JavaScript syntax and SVG parsing; browser walkthrough of all five post-turn warnings, response queue, summary, icon guide, and console errors; repository typecheck, build, and tests.
