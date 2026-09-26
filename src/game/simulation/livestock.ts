import { LIVESTOCK } from "../../data/livestock.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import type { GameState, LivestockState } from "../state/types.ts";
import type { NetworkResult } from "./utilityGraph.ts";

const feedFactor = { rationed: 0.7, normal: 1, high: 1.15 } as const;

export function growLivestock(state: GameState, network: NetworkResult): { livestock: LivestockState[]; meatYield: number; feedUsed: number; waterUsed: number } {
  let meatYield = 0;
  let feedUsed = 0;
  let waterUsed = 0;
  const livestock = state.livestock.map((animal) => {
    const module = state.modules.find((item) => item.id === animal.moduleId);
    if (!module) return animal;
    const def = MODULE_BY_ID.get(module.moduleId)!;
    const config = LIVESTOCK[animal.animal];
    const utility = Math.min(network.delivery[module.id]?.water ?? 0, network.delivery[module.id]?.power ?? 0);
    const availableFeed = Math.max(0, state.resources.food - feedUsed);
    const requiredFeed = config.feed * feedFactor[animal.feed];
    const feeding = requiredFeed > 0 ? Math.min(1, availableFeed / requiredFeed) : 1;
    feedUsed += Math.min(availableFeed, requiredFeed);
    waterUsed += config.water * 0.2;
    const growth = animal.growth + utility * feeding * module.integrity * feedFactor[animal.feed];
    if (growth < config.cycle) return { ...animal, growth };
    meatYield += Math.max(0, Math.round(def.baseYield * config.yieldFactor * utility * feeding * module.integrity));
    return { ...animal, growth: growth - config.cycle };
  });
  return { livestock, meatYield, feedUsed, waterUsed };
}
