# Ruleset v3 turn sidebar demo — V4 handoff

Preview: `public/assets/previews/ruleset-v3-interaction-demo-v4.html`. V1–V3 and every earlier HTML preview remain unchanged.

The outpost view now places a **functional turn rail beside the world image**. It displays live mock AP/resources; three per-turn entries for the emergency site, greenhouse care, and systems/supplies; a fuzzy forecast; the current incident; queued actions and costs; End Turn; and the settlement summary. The entries update after reveal, location inspection, response selection, bed care, cancellation, and settlement. Rail buttons navigate to the relevant view or focus the affected map marker. Players still click the marker itself to open its location-specific response choices.

The source art `public/assets/previews/gameplay-concept-v3.png` is unchanged. CSS shows approximately the left 72% of that illustration to exclude its **painted, nonfunctional** right-side controls. A functional forecast label covers the painted forecast in the remaining art. On wider screens the rail stays beside the world; on narrow phones it stacks below it.

The demonstrated sequence remains: event occurs → affected site appears → click site → choose a response → optional agriculture/systems actions → End Turn → centered next-turn risk warning. V2's five original hazard icons remain under `public/assets/previews/ruleset-v3-icons/`.

All values and outcomes are local illustrative data. Production integration should consume authoritative selectors for turn/AP/resources, current incident and affected coordinate, available response choices/costs, queued actions, bed state, communications status, settlement summary, and fuzzy next-turn risk. This preview changes no shared interface, GameState, Phaser architecture, resolver, scores, Photon, Supabase, or production pages.

Verification: browser walkthrough of the rail, location response, greenhouse action, queued resource projection, End Turn, and warning; JavaScript syntax; `npm run typecheck`, `npm run build`, and `npm test`.
