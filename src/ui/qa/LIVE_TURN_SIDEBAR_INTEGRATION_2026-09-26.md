# Live turn sidebar integration

Branch: `feat/live-game-turn-sidebar-integration-2026-09-26`

The approved V6 turn rail is mounted in the real `/game` operation phase. The earlier standalone HTML previews remain available. Design/intermission and completed mission panels retain their prior behavior.

The rail consumes the existing `GameState`, AP recovery selector, pending actions, module selection, and Mission Control connection/message state. Its End Turn button calls the existing resolver path; agriculture entries open the existing interiors; Systems focuses an existing module; queued actions can be cancelled individually. It displays the fuzzy forecast and labels any resolved hazard as **last turn**. It does not generate events, costs, resource deltas, or hazard responses.

The current state contract does not expose a pre-resolution event, an affected map coordinate, or legal same-turn emergency response options. Those V6 demo steps remain illustrative in the HTML only. A future gameplay ruleset would require Developer B's fields/actions and Developer A's map marker before that flow can be wired to the live rail.

Checked on `/game`: create Challenge run, place Habitat Core, begin operation, inspect the persistent rail, and End Turn through the real resolver. Typecheck, production build, and existing tests pass.
