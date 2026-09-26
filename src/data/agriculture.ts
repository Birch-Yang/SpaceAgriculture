export const AGRICULTURE = {
  waterActionCost: 1,
  feedActionCost: 1,
  careYieldMultiplier: 1.1,
  minigameModifierLimit: 0.1,
  cropWaterDemandFraction: 0.1,
  cropPowerDemandFraction: 0.1,
  livestockWaterFraction: 0.2,
  repairIntegrityGain: 0.25,
} as const;

export function slotBaseYield(baseYield: number, capacity: number, slotIndex: number): number {
  return Math.floor(baseYield / capacity) + (slotIndex < baseYield % capacity ? 1 : 0);
}

export function boundedModifier(value: number | undefined): number {
  return Math.max(-AGRICULTURE.minigameModifierLimit, Math.min(AGRICULTURE.minigameModifierLimit, value ?? 0));
}
