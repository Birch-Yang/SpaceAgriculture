# Cozy lunar farm · original pixel artwork

59 original SVG assets created from whole-pixel rectangles and 2:1 isometric polygons. CC0-1.0 dedication: https://creativecommons.org/publicdomain/zero/1.0/. No Stardew Valley sprites, proprietary UI assets, external fonts, or stock art are included. The game is a visual inspiration only.

## Inventory

- 19 module images: all 13 categories including corridor; greenhouse and livestock each have Compact, Standard, Industrial and a standard alias.
- 24 crop images: lettuce, radish, chili pepper, potato, soybean, Arabidopsis × planted, seedling, growing, ready. Arabidopsis ready means **Sample-ready**.
- 3 animals: chicken, pig, cow.
- 9 icons: temperature, radiation, impact/micrometeoroid, communications, power, water, oxygen, food, damage crack.
- 3 terrain tiles: dusty regolith variants including crater.
- 1 composed outpost scene with self-contained nested SVGs (no external image dependency).

`manifest.json` lists every file and the six-crop stage paths. `src/content/art/generate_assets.py` reproducibly creates these files without third-party dependencies. Once this set is delivered, make an additional version directory for future art revisions so old HTML snapshots remain visually preserved.

## Renderer handoff

Modules: 96×96 transparent canvas, approximate ground anchor (48,82). Crops/animals/icons: 32×32. Terrain: 64×36 including a 4px lower edge; top diamond is 64×32. Use nearest-neighbor scaling and whole-pixel positioning. Greenhouse/livestock variants add bays and equipment rather than changing category silhouettes.

The scene is decorative artwork, not a valid collision, placement, depth-sort, or utility graph specification. Developer A owns texture loading and real map composition. Sprite canvas size does not specify module footprint. State determines crop stage; do not map turn counts to art stages in UI. No growth timing, yields, or scientific measurements are encoded in these assets.

Original sprites remain in the unversioned asset folders. Original HTML and ui-v1/v2/v3 are unchanged.
