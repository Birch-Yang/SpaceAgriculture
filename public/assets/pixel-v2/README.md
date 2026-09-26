# Pixel v2 — coarser 2.5D art study

Original generated artwork, created with the built-in imagegen tool from the user's style references. The reference images themselves were not copied into this repository. No original game sprites or reference watermarks were extracted. All previous project assets and HTML snapshots are preserved.

## Delivered sheets

- `buildings.png`: 18 objects, nominal 6 columns × 3 rows. Upper-left light, visible roof and two faces, stepped silhouettes. Cream pressure shells, copper ribs, slate machinery, amber lamps. Greenery stays inside sealed structures.
- `crops.png`: six species × four stages, nominal 6 columns × 4 rows. Columns: lettuce, radish, chili pepper, potato, soybean, Arabidopsis. Rows: planted, seedling, growing, ready. Arabidopsis is sample-ready, not food production.
- `animals-systems.png`: 4 columns × 3 rows. Chicken, pig, cow, food; temperature, radiation, impact, communications; power, water, oxygen, repair.
- `reference-detail/`: retained higher-detail versions for before/after review.

Open `/assets/previews/pixel-elements-v1.html` to compare the lower-detail and higher-detail sheets. The low-resolution appearance is an imagegen simplification pass, not a mathematically guaranteed 32px/64px nearest-neighbor export. The large PNG dimensions are presentation export dimensions, not simulation cell dimensions.

## Integration limits

These are reviewed art-direction sheets, not production texture atlases. Generated building spacing is not an exact uniform cell grid, so do NOT load them with an assumed fixed frame width/height. Developer A should approve/cut individual frames and define ground anchors, depth sorting, collision footprints, ports and orientations. The terrain and corridors in the previous cozy-v1 pack remain available until revised tiles are approved. The crops and icon sheets intentionally have sage backgrounds; do not assume clean transparent alpha. Building rendering should also verify edge alpha before shipping.

No Phaser, simulation, crop contracts or shared interfaces were changed. Six-crop state mapping and research-sample behavior still require Developer B. These illustrations do not establish yield, growth timing or scientific validation.

Prompt set: `src/content/art/PIXEL_V2_PROMPTS.md`. Built-in imagegen only; no CLI/API-key workflow and no new dependencies.

## Livestock growth art

`livestock-stages.png`: 1536×1024 concept sheet, three columns (chicken/pig/cow) and two rows (juvenile/adult). Six original forms use the approved lower-detail design direction. Chicks are yellow without adult combs; piglets have shorter bodies and larger head proportions; calves have no horns or udder. This is art differentiation only.

`LivestockStageArt` consumes canonical AnimalKind plus an explicit UI-only `AnimalArtStage`. It shows a nominal cell of the sheet; it never derives maturity from growth. `src/content/livestock-art.ts` records labels and atlas cell positions. The sage backdrop is retained, so these are review/UI cells, not isolated transparent world sprites. Host/rendering integration must supply the life-stage selector and approved physical size/ground anchors. No timing or output formula was added.

Latest review: `/assets/previews/pixel-elements-v2.html`, opening directly to juvenile/adult livestock. V1 remains available.

## Lunar background

`lunar-background.png` is the matching empty lunar art plate: 1536×1024, fixed 2.5D camera, muted gray/lavender regolith, upper-left light and an open center with perimeter rocks/craters. It contains no buildings, corridors, labels or visible placement grid. The dark sky/background is baked into the image; this is not a seamless tile or transparent terrain sprite.

Use as a decorative backdrop only until Developer A defines the map-to-screen transform, valid placement cells and obstacle bounds. Apparent cliffs, rocks and craters do not automatically define collision or gameplay hazards. Drag-only/fixed orientation remains the current product rule. Latest review: `/assets/previews/pixel-elements-v3.html`, opening to the lunar background; earlier review versions remain intact.


## Continuous lunar surface v2

`lunar-background-v2.png` is a 1536×1024 art background generated with the built-in image tool. It supersedes the floating-platform composition for review, while preserving `lunar-background.png` and catalogue v3. Catalogue: `/assets/previews/pixel-elements-v4.html`.

Composition recommendation, not simulation geometry: approximately 20% space and 80% lunar ground within the world viewport (excluding UI). Reserve approximately 65% of the ground for base presentation. At a developed-base composition, buildings should visually occupy around 40–50% of that area; retain the remainder for corridors, spacing and dragging. Scale sprites from their canonical footprint, never independently stretch individual buildings. Use fixed orientation and common ground anchors, with foreground objects occluding objects behind them. The horizon is decorative; do not use perspective shrinking for placed buildings.

No exposed platform sides or finite island boundary. The art reaches both sides and the bottom. This is a single baked background, not a seamless scrolling texture or a placement/collision mask. Engine map dimensions remain unchanged.


## Adult failure states

`adult-failure-states.png`: 1536×1024, 3 columns × 3 rows. Row-major order: wilted mature lettuce, radish, chili pepper; wilted mature potato, soybean, Arabidopsis; dead adult chicken, pig, cow lying on their sides. No juvenile variants. Built-in image generation using crops.png and livestock-stages.png as style references.

Catalogue v5: `/assets/previews/pixel-elements-v5.html`. Earlier catalogues and healthy art remain unchanged. Sage background is baked in; sheet needs transparent extraction, frame/anchor review before engine use. Status must be supplied by simulation owner; art adds no death/wilting logic, thresholds, GameState fields or contracts.
