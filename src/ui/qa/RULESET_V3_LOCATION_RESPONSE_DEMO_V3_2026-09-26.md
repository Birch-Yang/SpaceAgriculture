# Ruleset v3 location response demo — V3 handoff

Preview: `public/assets/previews/ruleset-v3-interaction-demo-v3.html`. V1, V2, and all older HTML previews are preserved. This file is a standalone interaction mock, not the ranked game.

The demonstrated order is **event occurs → affected site appears on the outpost map → player clicks that site → site-specific choices appear → player selects one → End Turn settles**. End Turn stays disabled until a response is selected. Canceling that response disables settlement again. The selected response and its projected AP/resource cost remain visible in the turn queue, and the player can reopen the site to change it. Greenhouse bed actions remain available within the response window.

After settlement, the V2 centered flashing warning still shows only a broad risk category for the following turn. It does not reveal that turn's exact event or location. The Emergency panel links back to the highlighted map site when it has not been inspected; the same location choices are available there only after site inspection. The five original V2 hazard icons remain in `public/assets/previews/ruleset-v3-icons/`.

The map art and marker positions are illustrative, and all incident order, choices, costs, resources, and outcomes are local mock data. Production integration requires authoritative **current event**, **affected site or renderable coordinate**, **eligible response choices and costs**, **queued choice**, **settlement summary**, and **fuzzy next-turn risk** from the relevant owners. Developer A owns the world marker and engine interaction; Developer B owns authoritative event/resource state. This preview does not change GameState, Phaser, the hazard resolver, scores, replay, Photon, Supabase, or shared pages.

Verification: browser walkthrough across all five event locations, disabled End Turn before selection and after cancellation, choosing both temperature responses, warning after settlement, no browser console errors, embedded JavaScript syntax, `npm run typecheck`, `npm run build`, and `npm test`.
