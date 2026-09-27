# Current preview baseline

Open `public/assets/previews/current-preview-v1.html` through the running Next.js app at `/assets/previews/current-preview-v1.html`. Its selector contains only the current product pages and the currently approved standalone previews:

| Area | Current entry | Role |
| --- | --- | --- |
| Playable product | `/` (continues into `/game`) | Real app and authoritative game behavior |
| Records | `/leaderboard` | Real leaderboard and run archive |
| Patterns | `/analytics` | Real analytics; data requires Supabase configuration |
| First three screens | `ui-v11.html` | Current onboarding presentation |
| Map and build hover | `world-camera-v2.html` | Current camera/grid interaction preview |
| Art direction | `pixel-elements-v5.html` and recommended `pixel-v2/` sheets | Current approved art direction; sheets still need engine preparation |
| Hazard-turn flow | `ruleset-v3-interaction-demo-v6.html` | Current **mock** for reveal → affected site → choice → End Turn → warning |

The source repository's latest fetched integration baseline at creation was `origin/dev` `088d569`. The V6 hazard preview is on its own branch and is not live simulation logic. Do not mistake a standalone HTML preview for an integrated feature.

For future local UI work, fetch the target branch first, compare it with this set, and create a new HTML version while keeping the prior one. Use the versions in the table as the design reference; do not introduce elements from archived UI or art previews. Where an existing current preview still contains an older placeholder asset, keep its behavior as the reference and replace that asset from the approved current art direction during integration, rather than copying the placeholder into new work. Changes to Phaser, simulation, GameState, or shared contracts remain outside this UI preview scope.
