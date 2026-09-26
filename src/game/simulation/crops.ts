import { CROP_CATALOG } from '../../data/cropCatalog.ts';
import { CROPS } from "../../data/crops.ts";
import { AGRICULTURE, slotBaseYield } from "../../data/agriculture.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import { greenhouseRecyclingBonus, greenhouseWaterBonus, SYSTEMS } from "../../data/systems.ts";
import type { CropPlotState, GameState } from "../state/types.ts";
import type { NetworkResult } from "./utilityGraph.ts";

const settingFactor = { low: 0.72, medium: 1, high: 1.1 } as const;
const temperatureSetpoint = { low: 16, medium: 20, high: 24 } as const;

export function growCrops(state: GameState, network: NetworkResult): { crops: CropPlotState[]; waterUsed: number; powerUsed: number } {
  let waterUsed = 0;
  let powerUsed = 0;
  const crops = state.crops.map((plot) => {
    if (plot.ready || !plot.crop) return plot;
    const module = state.modules.find((item) => item.id === plot.moduleId);
    if (!module) return plot;
    const def = MODULE_BY_ID.get(module.moduleId)!;
    const water = network.delivery[module.id]?.water ?? 0;
    const power = network.delivery[module.id]?.power ?? 0;
    const setting = settingFactor[plot.water] * settingFactor[plot.light];
    const thermal = Math.max(0.35, 1 - Math.abs(state.resources.temperature - temperatureSetpoint[plot.temperature]) / 24);
    const progress = Math.min(1.2, water * power * setting * thermal * module.integrity);
    waterUsed += (def.flow.waterDemand ?? 0) * settingFactor[plot.water] * AGRICULTURE.cropWaterDemandFraction / def.capacity
      * (greenhouseWaterBonus(state, module) ? SYSTEMS.greenhouseWaterUseFactor : 1);
    powerUsed += (def.flow.powerDemand ?? 0) * settingFactor[plot.light] * CROPS[plot.crop].lightNeed * AGRICULTURE.cropPowerDemandFraction / def.capacity;
    const growth = plot.growth + progress;
    return { ...plot, growth, ready: growth >= CROPS[plot.crop].cycle };
  });
  return { crops, waterUsed, powerUsed };
}

export function harvestCrop(state: GameState, plotOrId: CropPlotState | string, network: NetworkResult, minigameModifier = 0): { yield: number; food: number; research: number } {
  const plot = typeof plotOrId === "string" ? state.crops.find(item => item.moduleId === plotOrId) : plotOrId;
  if (!plot) return { yield: 0, food: 0, research: 0 };
  const module = state.modules.find((item) => item.id === plot.moduleId);
  if (!plot.ready || !plot.crop || !module) return { yield: 0, food: 0, research: 0 };
  const def = MODULE_BY_ID.get(module.moduleId)!;
  const water = network.delivery[module.id]?.water ?? 0;
  const power = network.delivery[module.id]?.power ?? 0;
  if (CROP_CATALOG[plot.crop].role === 'research') return { yield: 0, food: 0, research: water > 0 && power > 0 && module.integrity > 0 ? CROP_CATALOG[plot.crop].researchYield : 0 };
  const temperature = Math.max(0.4, 1 - Math.abs(state.resources.temperature - temperatureSetpoint[plot.temperature]) / 30);
  const hazard = state.activeHazard?.type === "radiation" ? Math.max(0.5, 1 - state.activeHazard.severity * 0.3) : 1;
  const baseYield = slotBaseYield(def.baseYield, def.capacity, plot.slotIndex);
  const care = plot.wateredThisCycle ? AGRICULTURE.careYieldMultiplier : 1;
  const layout = greenhouseWaterBonus(state, module) ? SYSTEMS.greenhouseWaterYieldFactor : 1;
  const recycling = greenhouseRecyclingBonus(state, module) ? SYSTEMS.greenhouseRecycleYieldFactor : 1;
  const yieldAmount = Math.max(0, Math.round(baseYield * settingFactor[plot.water] * settingFactor[plot.light] * temperature * Math.min(water, power) * module.integrity * hazard * care * layout * recycling * (1 + minigameModifier)));
  return { yield: yieldAmount, food: Math.round(yieldAmount * CROPS[plot.crop].foodValue), research: 0 };
}
