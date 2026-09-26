import { CROPS } from "../../data/crops.ts";
import { CROP_CATALOG } from '../../data/cropCatalog.ts';
import { MODULE_BY_ID } from "../../data/modules.ts";
import type { CropPlotState, GameState } from "../state/types.ts";
import type { NetworkResult } from "./utilityGraph.ts";

const settingFactor = { low: 0.72, medium: 1, high: 1.1 } as const;
const temperatureSetpoint = { low: 16, medium: 20, high: 24 } as const;

export function growCrops(state: GameState, network: NetworkResult): { crops: CropPlotState[]; waterUsed: number; powerUsed: number } {
  let waterUsed = 0;
  let powerUsed = 0;
  const crops = state.crops.map((plot) => {
    if (plot.ready) return plot;
    const module = state.modules.find((item) => item.id === plot.moduleId);
    if (!module) return plot;
    const def = MODULE_BY_ID.get(module.moduleId)!;
    const water = network.delivery[module.id]?.water ?? 0;
    const power = network.delivery[module.id]?.power ?? 0;
    const setting = settingFactor[plot.water] * settingFactor[plot.light];
    const thermal = Math.max(0.35, 1 - Math.abs(state.resources.temperature - temperatureSetpoint[plot.temperature]) / 24);
    const progress = Math.min(1.2, water * power * setting * thermal * module.integrity);
    waterUsed += (def.flow.waterDemand ?? 0) * settingFactor[plot.water] * 0.1;
    powerUsed += (def.flow.powerDemand ?? 0) * settingFactor[plot.light] * CROPS[plot.crop].lightNeed * 0.1;
    const growth = plot.growth + progress;
    return { ...plot, growth, ready: growth >= CROPS[plot.crop].cycle };
  });
  return { crops, waterUsed, powerUsed };
}

export function harvestCrop(state: GameState, moduleId: string, network: NetworkResult): { yield: number; food: number; research: number } {
  const plot = state.crops.find((item) => item.moduleId === moduleId);
  const module = state.modules.find((item) => item.id === moduleId);
  if (!plot?.ready || !module) return { yield: 0, food: 0, research: 0 };
  const def = MODULE_BY_ID.get(module.moduleId)!;
  const water = network.delivery[module.id]?.water ?? 0;
  const power = network.delivery[module.id]?.power ?? 0;
  if (CROP_CATALOG[plot.crop].role === 'research') return { yield: 0, food: 0, research: water > 0 && power > 0 && module.integrity > 0 ? CROP_CATALOG[plot.crop].researchYield : 0 };
  const temperature = Math.max(0.4, 1 - Math.abs(state.resources.temperature - temperatureSetpoint[plot.temperature]) / 30);
  const hazard = state.activeHazard?.type === "radiation" ? Math.max(0.5, 1 - state.activeHazard.severity * 0.3) : 1;
  const yieldAmount = Math.max(0, Math.round(def.baseYield * settingFactor[plot.water] * settingFactor[plot.light] * temperature * Math.min(water, power) * module.integrity * hazard));
  return { yield: yieldAmount, food: Math.round(yieldAmount * CROPS[plot.crop].foodValue), research: 0 };
}
