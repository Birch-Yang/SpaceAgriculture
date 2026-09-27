# Hazard-turn preview V6 — reveal access fix

Preview: `public/assets/previews/ruleset-v3-interaction-demo-v6.html`. V5 and every earlier HTML preview remain unchanged.

In V5, **Reveal this turn** worked but sat below several cards inside the independently scrolling right rail. In a short browser window it was out of sight, making the event appear impossible to start. V6 adds a high-contrast primary action immediately above the outpost map. The action reads **Reveal event**, then **Locate event on map** until a site response is chosen, then **End Turn**, and finally **Next turn**. It uses the same local handlers as the rail controls; no rule or mock value changes.

Browser verification covered the visible Reveal event button, map marker, location-specific response, End Turn, centered next-turn warning, and console errors. The full V5 interaction and integration boundary are documented in `RULESET_V3_FULL_HAZARD_TURN_DEMO_V5_2026-09-26.md`.
