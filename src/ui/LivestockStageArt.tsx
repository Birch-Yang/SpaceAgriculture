import type { AnimalKind } from '../game/state/types';
import { livestockArt, type AnimalArtStage } from '../content/livestock-art';
/** Decorative art presentation. Sage background is part of the review sheet. */
export function LivestockStageArt({ animal, stage, size = 128 }: { animal: AnimalKind; stage: AnimalArtStage; size?: number }) {
  return <span role="img" aria-label={livestockArt.labels[animal][stage]} style={{ display: 'inline-block', width: size, height: size, imageRendering: 'pixelated', backgroundImage: `url(${livestockArt.sheet})`, backgroundSize: '300% 200%', backgroundPosition: `${livestockArt.column[animal] * 50}% ${livestockArt.row[stage] * 100}%`, backgroundRepeat: 'no-repeat' }} />;
}
