import type { AnimalKind } from '../game/state/types';
// Art state only. The host selects a stage; UI never derives maturity from growth.
export type AnimalArtStage = 'juvenile' | 'adult';
export const livestockArt = {
  sheet: '/assets/pixel-v2/livestock-stages.png',
  columns: 3,
  rows: 2,
  column: { chicken: 0, pig: 1, cow: 2 } satisfies Record<AnimalKind, number>,
  row: { juvenile: 0, adult: 1 } satisfies Record<AnimalArtStage, number>,
  labels: {
    chicken: { juvenile: 'Chick', adult: 'Chicken' },
    pig: { juvenile: 'Piglet', adult: 'Pig' },
    cow: { juvenile: 'Calf', adult: 'Cow' },
  } satisfies Record<AnimalKind, Record<AnimalArtStage, string>>,
} as const;
