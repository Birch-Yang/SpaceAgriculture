# Isolated UI integration

Branch `feat/ui-integration`, separate worktree `SpaceAgriculture-ui-integration`. Based on Developer A `e1ad13c` fetched from origin/feat/game; origin/dev at inspection was `039014f`. Original C branch `feat/ui-content` and all numbered HTML/art previews remain unchanged. Pre-integration shared page source copies live in `src/ui/preview/original-pages/` (exact files at e1ad13c).

Shared presentation files changed: app/page.tsx, app/game/page.tsx, app/leaderboard/page.tsx, app/analytics/page.tsx, app/report/[runId]/page.tsx. Purpose: mount UI composition and consume existing data interfaces. No interface changes; A/B source, dependencies and global CSS remain untouched relative to the fetched game branch.

- AppFrame adds agronaut navigation. Home and game use the same unmodified GameClient; callsign/mode/start remain its existing form, preventing duplicate state or duplicate onboarding. Returning via navigation starts a new client instance: no mid-run save is added.
- GamePresentation adds a scoped theme using imported CSS module class names from A. This dependency is visual only; no DOM mutation, state scraping, event injection, simulation or copied game controller. Coordinate with A when class exports change.
- RecordsScreen reads the existing leaderboard API, preserves server ordering and presents the selected score column. Rank is list position, not a new tie rule. Loading, failure/retry, empty records and aborted obsolete requests are handled.
- Analytics uses B's existing server aggregate getter. No new aggregation and no invented records. Missing backend configuration currently returns empty observations upstream.
- ReportScreen uses B's getter and checks stored report shape. Missing or malformed reports have explicit states. Existing getter does not return rules/LLM columns: those remain unavailable rather than reconstructed. Curated citation IDs are consumed only if present in the report.

## Still requiring A/B integration

World pixel-v2 sprites/background are **not** installed into Phaser. A owns frame extraction/loading/ground anchors/footprints/depth. Enlarged greenhouse concepts must be calibrated by A. Crop/animal failure art is not wired to inferred thresholds. B's source loader is still empty; current report citations may be empty. No current-run ID prop is exposed by GameClient for record highlighting. Photon history/service state and separate HUD state are not exposed to C; existing game panels remain authoritative. There is no added submission or report-generation call on completing a game: existing backend API is retained, not reimplemented. Tutorial currently can show in Challenge in A's controller; C has not changed that logic. These are explicit upstream gaps, not completed features.

Run `npm ci`, `npm run dev -- --hostname 127.0.0.1 --port 4180`. Existing gallery can still be served separately on 4173. No main merge or deployment.


## World artwork integration revision

The user explicitly reassigned Phaser image integration to C after v1. This supersedes the earlier world-art exclusion above. GameScene now loads pixel-v2/buildings.png as an atlas using source rectangles in src/content/world-art.ts, preserving original alpha and source files. It loads lunar-background-v2.png as the continuous backdrop. Building sprites use projected canonical footprint widths, bottom anchors and front-depth sorting; selection and placement retain existing cells/actions. Loading failure retains legacy block rendering. No new rotation or footprint rules. GameClient changes are limited to building thumbnail presentation. AgricultureInterior embeds C species art without changing actions.

Animal portraits use adult artwork for species identification, not an asserted maturity state. Crop art consumes only the existing ready flag; wheat uses the original wheat SVG because it has no pixel-v2 sprite. Greenhouse plants baked into building art are decorative; actual slot state remains in the interior panel. Failure and juvenile states await B's explicit lifecycle/status fields and are not guessed. Crops/animal panel art retains the sage backdrop intentionally. No raster is destructively edited; runtime atlas frames reference the original sheet.

Asset mappings include all 12 building categories and production variants. Corridors retain authoritative network overlay coloring; corridor artwork is retained in atlas metadata for later directional connection work. A's controllers, resolver, model contracts and build rules remain unchanged except the authorized presentation imports.
