import catalog from './crop-catalog.json' with { type: 'json' };

/** Stable, serialized IDs. Derive this union from the shared JSON, never duplicate it. */
export type CropId = keyof typeof catalog.crops;
export type CropDefinition = {
  label: string; labelEn: string; subtitle: string; description: string;
  role: 'food' | 'research'; cycle: number; power: number; water: number; thermal: number;
  yield: number; researchYield: number; legacyFoodValue: number; sensitivity: number;
  artColumn: number; evidence: 'reference-derived' | 'provisional'; evidenceNote: string;
};
export const CROP_SCHEMA_VERSION = catalog.schemaVersion;
export const CROP_BALANCE_VERSION = catalog.balanceVersion;
export const CROP_IDS = Object.freeze(Object.keys(catalog.crops) as CropId[]);

function validateCatalog() {
  for (const id of CROP_IDS) {
    const crop = catalog.crops[id];
    for (const field of ['cycle', 'power', 'water', 'thermal'] as const) {
      if (!Number.isFinite(crop[field]) || crop[field] <= 0) throw new Error(`${id}.${field} must be positive`);
    }
    for (const field of ['yield', 'researchYield', 'legacyFoodValue', 'sensitivity'] as const) {
      if (!Number.isFinite(crop[field]) || crop[field] < 0) throw new Error(`${id}.${field} must be nonnegative`);
    }
    if (!['food', 'research'].includes(crop.role) || !['reference-derived', 'provisional'].includes(crop.evidence)) throw new Error(`Invalid crop metadata: ${id}`);
    if (crop.role === 'research' && (crop.yield !== 0 || crop.legacyFoodValue !== 0)) throw new Error(`Research crop ${id} cannot produce food`);
    if (crop.role === 'food' && crop.researchYield !== 0) throw new Error(`Food crop ${id} cannot produce research samples`);
    if (!Number.isInteger(crop.artColumn) || crop.artColumn < 0 || crop.artColumn > 5) throw new Error(`Invalid art column: ${id}`);
    Object.freeze(crop);
  }
  return Object.freeze(catalog.crops) as Readonly<Record<CropId, Readonly<CropDefinition>>>;
}
export const CROP_CATALOG = validateCatalog();
export function isCropId(value: unknown): value is CropId {
  return typeof value === 'string' && Object.hasOwn(CROP_CATALOG, value);
}
/** Unknown IDs, including retired wheat, need an explicit migration decision. */
export function requireCropId(value: unknown): CropId {
  if (!isCropId(value)) throw new Error(`Unsupported crop ID: ${String(value)}; select one of ${CROP_IDS.join(', ')}`);
  return value;
}
