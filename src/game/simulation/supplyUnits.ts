/** Capacity prototype matching scripts/supply_simulation.py; all modules share supply. */
import { CROP_CATALOG, CROP_BALANCE_VERSION, requireCropId, type CropId } from '../../data/cropCatalog.ts';
export const SUPPLY_CROPS = CROP_CATALOG;
export type SupplyCrop = CropId;
export type SupplyConfig = { solar: number; recyclers: number; thermal: number; batteries: number; crops: SupplyCrop[] };
export type SupplyState = { balanceVersion: string; config: SupplyConfig; turn: number; battery: number; progress: number[]; harvested: number[]; research: number[]; nextCrops: (SupplyCrop | null)[] };
export const REFERENCE_SUPPLY: SupplyConfig = { solar: 2, recyclers: 1, thermal: 1, batteries: 1, crops: ['lettuce', 'soybean', 'potato'] };
export function newSupply(config: SupplyConfig = REFERENCE_SUPPLY): SupplyState {
  config.crops.forEach(requireCropId);
  return { balanceVersion: CROP_BALANCE_VERSION, config: { ...config, crops: [...config.crops] }, turn: 0, battery: 0, progress: config.crops.map(() => 0), harvested: config.crops.map(() => 0), research: config.crops.map(() => 0), nextCrops: config.crops.map(() => null) };
}
export function chooseSupplyCrop(state: SupplyState, index: number, crop: SupplyCrop): SupplyState {
  requireCropId(crop);
  if (state.turn >= 12 || !Number.isInteger(index) || index < 0 || index >= state.config.crops.length) throw new Error('Cannot change this greenhouse');
  const crops = [...state.config.crops];
  const nextCrops = [...state.nextCrops];
  if (state.progress[index] === 0) { crops[index] = crop; nextCrops[index] = null; }
  else nextCrops[index] = crop === crops[index] ? null : crop;
  return { ...state, config: { ...state.config, crops }, nextCrops };
}
function allocate(available: number, requests: number[]) {
  return requests.map(demand => { const delivered = Math.min(available, demand); available = Math.max(0, available - delivered); return delivered; });
}
export function supplyEvent(turn: number) {
  return turn === 4 ? 'Low sunlight · Solar output halved' : turn === 7 ? 'Extreme temperature · Thermal power demand doubled' : turn >= 10 ? 'Array damage · Solar output at 75%' : 'Normal conditions';
}
export function resolveSupply(state: SupplyState) {
  if (state.balanceVersion !== CROP_BALANCE_VERSION) throw new Error('Crop settings have changed. Please reset this run.');
  if (state.turn >= 12) throw new Error('This mission has ended');
  const c = state.config;
  if ([c.solar, c.recyclers, c.thermal, c.batteries].some(n => !Number.isInteger(n) || n < 0)) throw new Error('Invalid facility count');
  const turn = state.turn + 1;
  const cropDefs = c.crops.map(crop => SUPPLY_CROPS[requireCropId(crop)]);
  const thermalDemand = c.thermal * (turn === 7 ? 4 : 2);
  // Habitat, oxygen, thermal, recycling, communications, agriculture.
  const demands = [1, 1, thermalDemand, c.recyclers, 1, ...cropDefs.map(crop => crop.power)];
  const powerDemand = demands.reduce((a, b) => a + b, 0);
  const generation = c.solar * 12 * (turn === 4 ? 0.5 : turn >= 10 ? 0.75 : 1);
  const discharge = Math.min(Math.max(0, powerDemand - generation), state.battery, c.batteries * 6);
  const power = allocate(generation + discharge, demands);
  const battery = Math.min(c.batteries * 6, state.battery - discharge + Math.max(0, generation - powerDemand));
  const waterSupply = power[3] * 12;
  const waterDemand = 2 + cropDefs.reduce((sum, crop) => sum + crop.water, 0);
  const water = allocate(waterSupply, [1, 1, ...cropDefs.map(crop => crop.water)]);
  const thermalSupply = thermalDemand ? c.thermal * 4 * power[2] / thermalDemand : 0;
  const thermalNeed = 1 + cropDefs.reduce((sum, crop) => sum + crop.thermal, 0);
  const thermal = allocate(thermalSupply, [1, ...cropDefs.map(crop => crop.thermal)]);
  const coverage = cropDefs.map((crop, i) => ({ power: power[i + 5] / crop.power, water: water[i + 2] / crop.water, thermal: thermal[i + 1] / crop.thermal }));
  const growth = coverage.map(value => Math.min(1, value.power, value.water, value.thermal));
  const progress = state.progress.map((value, i) => value + growth[i]);
  const matured = progress.map((value, i) => value >= cropDefs[i].cycle - 1e-9);
  const harvest = matured.map((ready, i) => ready ? cropDefs[i].yield : 0);
  const researchHarvest = matured.map((ready, i) => ready ? cropDefs[i].researchYield : 0);
  const critical: string[] = [];
  if (power[0] < 1 || power[1] < 1) critical.push('Insufficient life-support power');
  if (water[0] < 1 || water[1] < 1) critical.push('Insufficient water for habitat and oxygen generation');
  if (thermal[0] < 1) critical.push('Habitat thermal control failed');
  const next: SupplyState = { balanceVersion: state.balanceVersion, config: { ...c, crops: c.crops.map((crop, i) => matured[i] && turn < 12 ? state.nextCrops[i] ?? crop : crop) }, turn, battery, progress: progress.map((value, i) => matured[i] ? 0 : value), harvested: state.harvested.map((value, i) => value + harvest[i]), research: state.research.map((value, i) => value + researchHarvest[i]), nextCrops: state.nextCrops.map((crop, i) => matured[i] ? null : crop) };
  return { next, turn, generation, powerDemand, waterSupply, waterDemand, thermalSupply, thermalNeed, discharge, coverage, growth, harvest, researchHarvest, critical, event: supplyEvent(turn) };
}
export type SupplyReport = ReturnType<typeof resolveSupply>;
