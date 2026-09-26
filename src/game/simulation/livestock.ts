import { LIVESTOCK } from "../../data/livestock.ts";
import { AGRICULTURE, slotBaseYield } from "../../data/agriculture.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import type { GameState, LivestockState } from "../state/types.ts";
import type { NetworkResult } from "./utilityGraph.ts";

const feedFactor = { rationed: 0.7, normal: 1, high: 1.15 } as const;

export function growLivestock(state: GameState, network: NetworkResult): { livestock: LivestockState[]; meatYield: number; feedUsed: number; waterUsed: number; outputs: Array<{ moduleId: string; slotIndex: number; yield: number }> } {
  let meatYield = 0;
  let feedUsed = 0;
  let waterUsed = 0;
  const outputs: Array<{ moduleId: string; slotIndex: number; yield: number }> = [];
  const livestock = state.livestock.map((animal) => {
    if (!animal.animal) return animal;
    const module = state.modules.find((item) => item.id === animal.moduleId);
    if (!module) return animal;
    const def = MODULE_BY_ID.get(module.moduleId)!;
    const config = LIVESTOCK[animal.animal];
    const utility = Math.min(network.delivery[module.id]?.water ?? 0, network.delivery[module.id]?.power ?? 0);
    const availableFeed = Math.max(0, state.resources.food - feedUsed);
    const requiredFeed = config.feed * feedFactor[animal.feed] / def.capacity;
    const feeding = requiredFeed > 0 ? Math.min(1, availableFeed / requiredFeed) : 1;
    feedUsed += Math.min(availableFeed, requiredFeed);
    waterUsed += config.water * AGRICULTURE.livestockWaterFraction / def.capacity;
    const growth = animal.growth + utility * feeding * module.integrity * feedFactor[animal.feed];
    if (growth < config.cycle) return { ...animal, growth };
    const care = animal.fedThisCycle ? AGRICULTURE.careYieldMultiplier : 1;
    const output = Math.max(0, Math.round(slotBaseYield(def.baseYield, def.capacity, animal.slotIndex) * config.yieldFactor * utility * feeding * module.integrity * care * (1 + animal.feedMinigameModifier)));
    meatYield += output;
    outputs.push({ moduleId: animal.moduleId, slotIndex: animal.slotIndex, yield: output });
    return { ...animal, growth: growth - config.cycle, fedThisCycle: false, feedMinigameModifier: 0 };
  });
  return { livestock, meatYield, feedUsed, waterUsed, outputs };
}
