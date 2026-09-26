import { CROP_CATALOG, CROP_IDS, type CropId } from '../data/cropCatalog';

/** Presentation metadata is derived from the canonical six-crop catalog. */
export const cropArt = CROP_IDS.map(id => ({
  id, label: CROP_CATALOG[id].labelEn, subtitle: CROP_CATALOG[id].subtitle,
  description: CROP_CATALOG[id].description,
  readyLabel: CROP_CATALOG[id].role === 'research' ? 'Sample ready' : 'Harvest-ready',
}));
export type CropArtId = CropId;
export type CropArtStage = 'planted' | 'seedling' | 'growing' | 'ready';
export const cropArtStages: readonly CropArtStage[] = ['planted', 'seedling', 'growing', 'ready'];
