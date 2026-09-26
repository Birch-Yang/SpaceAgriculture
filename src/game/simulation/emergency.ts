import { EMERGENCY } from "../../data/emergency.ts";
import { SYSTEMS } from "../../data/systems.ts";
import type { GameState, PlayerAction, ResourceKey } from "../state/types.ts";

export const emergencyResources: readonly ResourceKey[] = ["power", "water", "oxygen", "food"];
export const emergencySupplyAmount = (resource: ResourceKey): number => SYSTEMS.baseStorage[resource] * EMERGENCY.refillFraction;
export const suppliesRemaining = (state: GameState): number => state.emergencySuppliesRemaining ?? EMERGENCY.suppliesPerRun;
export const isPaused = (state: GameState, moduleId: string): boolean => state.pausedModuleIds?.includes(moduleId) ?? false;
export const isEmergencyAction = (action: PlayerAction): boolean => action.type === "PAUSE_MODULE" || action.type === "USE_EMERGENCY_SUPPLY";
export const isAgricultureAction = (action: PlayerAction): boolean => ["PLANT_CROP", "SET_CROP_PARAMS", "HARVEST_CROP", "WATER_PLOT", "SET_ANIMAL", "SET_LIVESTOCK_PARAMS", "FEED_STALL"].includes(action.type);
export function operationActionCost(state: GameState, action: PlayerAction, accepted: readonly PlayerAction[]): number {
  if (isEmergencyAction(action) && state.crisis && !accepted.some(isEmergencyAction)) return 0;
  return action.type === "REPAIR" ? 2 : action.type === "END_TURN" ? 0 : 1;
}
