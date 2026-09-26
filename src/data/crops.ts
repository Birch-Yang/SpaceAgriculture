import { CROP_CATALOG, CROP_IDS, type CropId } from './cropCatalog.ts';
/** Compatibility view for the existing network simulator; new UI uses CROP_CATALOG. */
export const CROPS = Object.fromEntries(CROP_IDS.map(id => [id, {
  cycle: CROP_CATALOG[id].cycle, foodValue: CROP_CATALOG[id].legacyFoodValue,
  sensitivity: CROP_CATALOG[id].sensitivity, lightNeed: CROP_CATALOG[id].power / 2,
}])) as Record<CropId, { cycle: number; foodValue: number; sensitivity: number; lightNeed: number }>;
