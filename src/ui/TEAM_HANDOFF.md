# UI and art team delivery

## Entry points and recommendations

Serve the repository with `npm run dev` and visit `/assets/catalogue.html`. No external font/CDN or separate dependency is needed. `public/assets/catalogue.json` inventories every SVG, PNG and HTML snapshot: repository path, public URL, actual image dimensions, bytes, purpose, readiness, recommended flag and provenance. HTML dimensions are responsive/null. Rebuild the index with `python3 src/content/art/build_catalogue.py`.

| Deliverable | Recommended version | Readiness |
| --- | --- | --- |
| UI presentation | `/assets/previews/ui-v6.html` | React-generated mock; not mounted in app pages |
| Element review | `/assets/previews/pixel-elements-v5.html` | Latest combined art review |
| Gameplay composition | `/assets/previews/gameplay-concept-v3.html` | Generated illustration; enlarged glass greenhouses, readable crops |
| Continuous ground | `/assets/pixel-v2/lunar-background-v2.png` | Baked backdrop; no platform edge, no seamless tiling |
| Buildings | `/assets/pixel-v2/buildings.png` | 18 elements; irregular sheet bounds, not engine frames |
| Crops | `/assets/pixel-v2/crops.png` | 6 species × 4 stages; sage background |
| Livestock | `/assets/pixel-v2/livestock-stages.png` | Chicken/pig/cow × juvenile/adult |
| Failure art | `/assets/pixel-v2/adult-failure-states.png` | 6 mature wilted crops + 3 side-lying dead adults; user accepted |
| Icons | `/assets/pixel-v2/animals-systems.png` | Animals and system icons, pending extraction |
| Current UI placeholders | `/assets/cozy-v1/` | Individual SVGs consumed by React; preserved fallback set |

All numbered previews and original assets are preserved. New visual revisions must use new filenames. Recommended means current review choice, not engine-ready certification. Pixel sheets retain their generated backgrounds; no clean alpha, exact tile bounds or collision geometry is promised. Original programmatic SVG licensing is documented separately; do not apply its CC0 claim automatically to generated reference sheets. User-provided references informed style; source reference images are not redistributed in this delivery. Prompts and built-in generation provenance live in `src/content/art/`.

## Responsibilities and next integration

Developer C: React presentation, accessible icons, source content, art mapping, and later approved frame/transparent preparation. `INTEGRATION.md` documents component props and callbacks. `GreenhouseArtPanel` accepts an explicit art crop/stage and host-supplied legality; `LivestockStageArt` accepts animal, juvenile/adult stage and display size. Neither derives simulation state. The new failure sheet currently has no runtime adapter.

Developer A: Phaser sprite loading, map placement, fixed-facing drag-only controls, physical footprint alignment, ground anchors, depth order, hit areas, corridor ports and renderer performance. Use existing canonical footprints. The enlarged greenhouse screenshot is a visual proposal; it does not authorize changing footprint contracts. If the sprite overlaps neighboring modules, coordinate a visual solution or report required shared changes before editing contracts. No facing variants or rotate controls are required.

Developer B: authoritative crop stage/maturity/failure selectors, action validity, resource severity, livestock water/temperature status, Photon history/connection and report scores. Canonical crop types currently differ from the six-species art roster; do not cast art IDs into simulation CropKind. Wilted/dead art does not implement mortality, recovery or harvesting semantics. Show unavailable/placeholder presentation until fields exist.

Shared `app/**` pages remain unchanged. Before mounting UI, list exact page files and why the shared presentation edits are needed. Keep the existing pages and previews until coordinated. No game, database, network, scoring or dependency changes are included.

## Suggested review sequence

1. Integrate Developer B bootstrap dependency into `dev` before the UI branch (see branch history); review C changes there, never merge directly to `main`.
2. Open catalogue, UI v6 and gameplay v3. Use catalogue JSON to find each file and readiness limitation.
3. Agree on greenhouse visual scale against canonical map cells; concept percentages are not verified geometry.
4. Prepare versioned individual frames/alpha without overwriting original sheets; validate silhouettes, anchors and pixel density with A.
5. B supplies missing state; C adapts UI props and A loads world sprites through existing interfaces.
6. Run typecheck, build, tests and integrated browser checks. Verify warning/critical/offline/failure states against real data. Sample preview values must not be presented as simulation output.

No remote push, PR, merge or deployment is part of this local handoff.
