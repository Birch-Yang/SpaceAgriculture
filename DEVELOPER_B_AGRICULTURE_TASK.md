# Developer B task: independent agriculture slots and turn settlement

This is the implementation handoff for Developer B. Read the project owner’s complete `Lunar_Agriculture_Hackathon_Codex_SPEC.md` before changing code. The owner’s latest decisions for this task are: Greenhouse is the crop area, Livestock Module is the farm area, compact/standard/industrial variants have 1/2/3 independently simulated slots, watering and feeding happen at most once per growth cycle, and rotation has been removed from the game controls. Do not restore rotation or spend time on UI polish.

## Ownership and integration rules

- Work in your Developer B feature branch. Your implementation belongs in `src/game/state/**`, `src/game/simulation/**`, the relevant `src/data/**` numeric configuration, and any B-owned downstream reader affected by nullable slots. Do not refactor `src/game/phaser/**` or the designer’s UI, copy, or assets.
- `src/game/state/types.ts` is a shared interface. Before editing it, tell Developer A exactly why the change is needed: the current `GameState` holds one crop or animal record per module, and `PlayerAction` cannot target a slot, request one-cycle care, or carry a minigame modifier. Agree on the fields below; do not silently rename them.
- Keep the existing `createInitialState` → `applyBuildAction` → `startOperation` → `resolveTurn` architecture. Phaser emits actions and renders the returned `GameState`; the resolver alone owns AP, resources, growth, output, and scoring.
- Make small descriptive commits and target `dev` for integration. Do not merge directly into `main`; do not add a framework, major dependency, secrets, or API keys.

## Exact shared contract to deliver

Keep all existing fields unless a type below explicitly changes them. Add these fields to the existing state records:

```ts
type CropPlotState = {
  moduleId: string;
  slotIndex: number;              // zero-based, unique within the module
  crop: CropKind | null;          // null means an empty plot
  growth: number;
  ready: boolean;
  water: Setting;
  light: Setting;
  temperature: Setting;
  wateredThisCycle: boolean;
};

type LivestockState = {
  moduleId: string;
  slotIndex: number;              // zero-based, unique within the module
  animal: AnimalKind | null;      // null means an empty stall
  growth: number;
  feed: "rationed" | "normal" | "high";
  fedThisCycle: boolean;
  feedMinigameModifier: number;   // neutral 0, retained until the next output
};
```

For each placed agriculture module, create **exactly `ModuleDefinition.capacity` records**, indexed `0..capacity-1`. The current definitions already use capacities 1, 2, and 3. Initialize slot 0 with lettuce or chicken as the example occupant; all other slots are empty. Initialize settings to their current defaults, growth to 0, care flags to `false`, and the stored modifier to 0. Removing a module removes every associated slot. There is no active save system, so do not add a save migration for this feature.

Extend existing agricultural `PlayerAction` variants with `slotIndex?: number`; omitted means slot 0 so current callers and tests remain valid. This applies to `PLANT_CROP`, `HARVEST_CROP`, `SET_CROP_PARAMS`, `SET_ANIMAL`, and `SET_LIVESTOCK_PARAMS`. Add:

```ts
{ type: "WATER_PLOT"; moduleId: string; slotIndex: number }
{ type: "FEED_STALL"; moduleId: string; slotIndex: number; minigameModifier?: number }
```

Add optional `minigameModifier?: number` to `HARVEST_CROP` and `REPAIR` as well. Leave `PLACE_MODULE.rotation` in the shared type for compatibility; Developer A always emits `0` now. Do not add rotation controls.

Developer A has already built `src/game/phaser/agricultureAdapter.ts`. It recognizes the new contract only when a module has exactly `capacity` records and every record has an integer `slotIndex`. Its care flags and action field names match those above. Once your state and resolver are integrated, the additional slot controls and contextual minigames can become active without moving simulation logic into Phaser.

## Turn and balance rules

1. **Target validation:** Resolve an agricultural action by `(moduleId, slotIndex ?? 0)`. Verify the module exists, has the matching category, and contains that slot. Reject invalid indices, missing modules, wrong categories, empty-slot care or harvest, immature harvest, repeated care in one cycle, and invalid modifiers. Rejected actions consume no AP or resources and do not mutate state. Include module and slot in the rejection message.
2. **AP:** Keep current AP recovery and action ordering. Planting, choosing an animal, changing parameters, harvesting, watering, and feeding cost 1 AP each; repair remains 2 AP; `END_TURN` remains 0. Validate the recovered AP before each action. Preserve deterministic resolution and input immutability.
3. **Plant and animal choice:** `PLANT_CROP` works on an empty or occupied plot and resets growth, ready, and `wateredThisCycle`. `SET_ANIMAL` works on an empty or occupied stall and resets growth, `fedThisCycle`, and `feedMinigameModifier`. Parameter and feed-level changes may be set on empty slots so players can prepare them; empty slots still produce and consume nothing.
4. **Care:** `WATER_PLOT` consumes 1 water and marks `wateredThisCycle`; `FEED_STALL` consumes 1 food and marks `fedThisCycle`. Each is allowed once until that slot completes its growth cycle. If the resource is below 1, reject before charging AP. Successful watering adds 10% to that crop’s next harvest output. Successful feeding adds 10% to that animal’s next meat output. Crops otherwise continue to grow under the existing network/parameter rules; livestock keeps the existing baseline feed consumption. Reset the crop care flag after harvest and the animal care flag and stored modifier after its next output.
5. **Capacity and resource balance:** Treat `baseYield` as a **module total**, not a per-slot yield. Allocate integer base shares as `floor(baseYield / capacity)` plus one for the lowest `baseYield % capacity` indices; apply the existing crop or animal factors to each occupied slot’s share. Distribute existing per-module extra crop water/power and livestock feed/water usage across capacity, then count occupied slots only. Keep the network module flow profile and difficulty targets unchanged. Place any new numeric care constants in a B-owned `src/data/**` configuration file, not in Phaser.
6. **Minigames:** Missing modifier means 0. Require a finite number and clamp accepted values to `[-0.1, 0.1]`. Apply a harvest modifier only to that targeted crop harvest, a feed modifier to that stall’s next meat output, and a repair modifier to the existing `0.25` integrity gain. Apply each as a multiplier `1 + modifier`, with care’s `1.1` multiplier applied separately. Clamp repair integrity at 1. A failed minigame may lower one action by at most 10%; it must not end a run by itself.
7. **Cycle completion:** A harvest resets only its targeted plot to growth 0 and `ready: false` while keeping the crop planted, as the current game does. Animal output remains automatic when its own cycle completes; preserve its leftover growth and reset only that stall’s care state. Empty slots never grow, produce, or consume.

The existing `src/backend/runs.ts` may continue serializing the full slot arrays. Update `src/backend/analytics.ts` to skip records whose `crop` or `animal` is `null`, so empty slots are not counted as species. Do not expand backend or AI work beyond consumers actually affected by this type change.

## Minimal verification and handoff

Keep tests proportional. A small set of resolver tests should cover: 1/2/3 slot initialization and slot isolation; empty slots producing nothing; one-cycle care and duplicate/insufficient-resource rejection without AP loss; bounded, target-specific minigame effects and deterministic replay. Keep the existing connected ten-turn Challenge baseline passing; adjust its actions to plant additional slots if the new capacity split requires it. Run `npm test`, `npm run typecheck`, and `npm run build` once as integration gates. Do not run repeated browser sweeps or add broad tests without a concrete failure.

When done, report changed files, the final shared types/actions, numeric balance choices, test results, known issues, the commit hash, and any integration step Developer A must perform. Send Developer A the contract diff before merging so the temporary casts in `agricultureAdapter.ts` can be removed safely. The feature is complete when a standard module’s two slots and an industrial module’s three slots can be operated independently through `resolveTurn`, with correct AP, resources, output, and per-slot feedback.
