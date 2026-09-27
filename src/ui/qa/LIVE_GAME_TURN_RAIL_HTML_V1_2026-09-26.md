# Live-game turn rail HTML study — V1

Preview: `public/assets/previews/live-game-turn-rail-v1.html` (open through the running Next.js app at `/assets/previews/live-game-turn-rail-v1.html`). All earlier HTML previews and the live `/game` route remain unchanged.

This layout uses the current real game's operation shell: top resource dashboard, Mission Tools at left, centered lunar base, and the current dark teal treatment. It adds the V6 persistent turn rail on the right. The map is a presentation canvas using the current `pixel-v2/lunar-background-v2.png` and source rectangles from the current `pixel-v2/buildings.png` atlas. It is an illustrative arrangement, not a screenshot or a Phaser world state.

The local interaction demonstrates Reveal event → marked power-bus location → response choice → optional greenhouse/livestock care queued against example AP → End Turn → turn summary and fuzzy next-turn warning. The rail's primary button stays at its top. Module inspection and queue cancellation work inside the HTML. Starting resources and module count resemble an example Challenge operation screen but are **mock presentation values**, not read from GameState; result deltas are illustrative and do not establish balance.

Production integration later would need authoritative selectors for current incident, affected world position, valid response options and costs, AP projection, selected module, queued actions, resources, Mission Control state, result summary, and next-turn fuzzy warning. Developer C can present those values after shared contracts are agreed. This study does not change `resolveTurn`, hazard logic, Phaser architecture, GameState, scoring, Photon, Supabase, or a production page.

Validation: browser walkthrough of reveal, site response, greenhouse care, queue, End Turn, and warning; HTML/script parse; typecheck, build, tests.
