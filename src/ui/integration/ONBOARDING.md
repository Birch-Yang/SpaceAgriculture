# Approved v10 onboarding

The home route now renders title → briefing → setup → existing GameClient. `Onboarding` accepts a `form: ReactNode`; GameClient retains nickname, mode, optional iMessage enrollment, and mission creation. No GameState fields or balance parameters changed.

Artwork: `/assets/previews/gameplay-concept-v3.png`, 1536×1024. SVG viewBox `0 160 1120 864` crops the illustration while preserving proportions. Glow, beacon, and utility effects are decorative, support pause and reduced motion, and do not represent simulation state.

Original HTML versions v7–v10 remain under `/assets/previews/`. v10 is the approved reference. Project introduction copy remains explicitly marked as placeholder.

Validation: typecheck, production build, 27 tests, and browser verification of title → briefing → setup → Progressive design phase. Optional messaging was left blank during UI verification.

The running integration checkout includes concurrent balance/backend work. This UI-only commit is isolated on `feat/ui-onboarding-v10`; do not merge the branch wholesale into older branches without reviewing its baseline. Cherry-pick the UI commit when integrating elsewhere.

## Playable world camera fix

`GameScene.ts` now uses world scroll factor 1 for the lunar background, preserves its aspect ratio, and bounds selection focus to the background. The full grid is hidden; existing placement footprints and current-cell build hover remain. Leaving the canvas clears hover. Existing placement, move, selection, and corridor actions are unchanged.

Validated with typecheck, 27 tests, production build in the running integration checkout, and a browser test placing/selecting a habitat then dragging it from (5,5) to (7,5) after focus zoom. The isolated checkout build initially rejected its external dependency symlink; the same source built successfully in the running checkout.
