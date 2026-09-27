# Agriculture care v3 (experimental)

Branch: `balance/agriculture-care-v1-2026-09-26`. New browser runs create transcript version 3. Archived version 1 and 2 transcripts continue to replay with their previous agriculture rules. This branch is not merged into `dev`.

Each greenhouse keeps its existing 1, 2, or 3 independent plots. A seed pack can be clicked or dragged onto a bed. The bed shows sprouting, seedling, maturing, and harvest-ready states. A watering can or pruning tool can be clicked or dragged onto one bed. Each action is queued and resolves on End Turn; the displayed moisture and health come from the resolver, not from UI calculations. Automatic irrigation supports baseline growth.

Each livestock slot keeps its existing cycle. Its animal moves visually inside the stall; movement does not affect production or replay. Feed and cleaning tools target a specific stall. Automatic feeding remains the baseline.

## Changed values and behavior

| Rule | Previous | v3 |
| --- | --- | --- |
| Plot moisture | No persistent value | 0–100; starts at 60; automatic irrigation adds up to 14 per connected turn; setting-based evaporation removes 8.64–13.2; manual watering costs 1 Water and 1 AP and adds 35 |
| Dryness | No persistent effect | Below 25: 55% slower growth and 7 health loss per turn |
| Overwatering | No persistent effect | Above 85 for two consecutive turns: 5 health loss per turn |
| Plant health | No persistent value | Starts at 100; thermal and hazard stress can reduce it; a 1 AP inspect/prune action restores 20 |
| Crop harvest | Module base yield divided by slots | Catalog crop yield is the base per plot: lettuce 10, radish 12, chili 35, potato 90, soybean 50; adjusted by utilities, conditions, health, and existing modifiers |
| Crop repeat | Every crop regrew | Lettuce and chili regrow; radish, potato, soybean, and Arabidopsis clear the bed after harvest |
| Livestock care | Feed bonus once per cycle | Satiety starts at 70, cleanliness at 90, health at 100; automatic feed maintains baseline; manual feed adds 30 satiety for 1 Food and 1 AP; cleaning adds 35 cleanliness for 1 AP |
| Soybean residue | None | A successful soybean harvest yields one residue unit, allocatable to feed reserve or greenhouse nutrients |
| Research sample | Stored only | One sample can be spent on a diagnostic or a refined forecast note |

These are game balance parameters, not lunar field measurements. Version 3 score distributions need separate evaluation before any leaderboard comparison with archived rulesets. The existing leaderboard has no ruleset filter; do not interpret mixed-version ranks as directly comparable.

## Integration contract

New optional fields on crop plots: `moisture`, `health`, `wetTurns`. New optional fields on livestock: `satiety`, `cleanliness`, `health`. New production inventory: `researchAvailable`, `cropResidue`, `feedReserve`, `nutrients`. New replayable actions: `PRUNE_PLOT`, `CLEAN_STALL`, `ALLOCATE_RESIDUE`, and `USE_RESEARCH`. Version 1/2 states omit these fields and retain their original calculations. The UI reads the version 3 values through `agricultureSlots`.

Known scope: the diagnostic and forecast sample actions currently write a mission-history note rather than opening a dedicated analysis panel. Animal movement is visual; authoritative outcomes remain slot-based. Challenge balance and completion rates have not yet been calibrated against player runs.
