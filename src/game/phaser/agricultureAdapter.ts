import { MODULE_BY_ID } from "../../data/modules.ts";
import { CROPS } from "../../data/crops.ts";
import { LIVESTOCK } from "../../data/livestock.ts";
import type { AnimalKind, CropKind, CropPlotState, GameState, LivestockState, PlayerAction, Setting } from "../state/types.ts";
import type { MinigameProof } from "../minigames/proof.ts";

// The renderer accepts the current one-plot contract and the proposed slot contract.
// It never simulates growth or resources; empty legacy slots stay unavailable until B's resolver exists.
type CropSlotState = Omit<CropPlotState, "crop"> & { slotIndex?: number; crop: CropKind | null; wateredThisCycle?: boolean };
type AnimalSlotState = Omit<LivestockState, "animal"> & { slotIndex?: number; animal: AnimalKind | null; fedThisCycle?: boolean };

export type CropSlotView = { index: number; crop: CropKind | null; progress: number; ready: boolean; water: Setting; light: Setting; temperature: Setting; wateredThisCycle?: boolean; supported: boolean };
export type AnimalSlotView = { index: number; animal: AnimalKind | null; progress: number; feed: "rationed" | "normal" | "high"; fedThisCycle?: boolean; supported: boolean };

function progressPercent(growth: number, cycle: number): number { return Math.round(Math.max(0, Math.min(100, growth / cycle * 100))); }

export function agricultureSlots(state: GameState, placedModuleId: string): { kind: "greenhouse"; slots: CropSlotView[]; fullContract: boolean } | { kind: "livestock"; slots: AnimalSlotView[]; fullContract: boolean } | null {
  const placed = state.modules.find((module) => module.id === placedModuleId);
  const definition = placed && MODULE_BY_ID.get(placed.moduleId);
  if (!definition || (definition.category !== "greenhouse" && definition.category !== "livestock")) return null;
  const capacity = Math.max(1, definition.capacity);
  if (definition.category === "greenhouse") {
    const records = state.crops.filter((plot) => plot.moduleId === placedModuleId) as CropSlotState[];
    const fullContract = records.length === capacity && records.every((plot) => Number.isInteger(plot.slotIndex));
    const slots = Array.from({ length: capacity }, (_, index): CropSlotView => {
      const plot = fullContract ? records.find((item) => item.slotIndex === index) : index === 0 ? records[0] : undefined;
      return { index, crop: plot?.crop ?? null, progress: plot?.crop ? progressPercent(plot.growth, CROPS[plot.crop].cycle) : 0, ready: plot?.ready ?? false,
        water: plot?.water ?? "medium", light: plot?.light ?? "medium", temperature: plot?.temperature ?? "medium",
        wateredThisCycle: plot?.wateredThisCycle, supported: Boolean(plot) };
    });
    return { kind: "greenhouse", slots, fullContract };
  }
  const records = state.livestock.filter((animal) => animal.moduleId === placedModuleId) as AnimalSlotState[];
  const fullContract = records.length === capacity && records.every((animal) => Number.isInteger(animal.slotIndex));
  const slots = Array.from({ length: capacity }, (_, index): AnimalSlotView => {
    const animal = fullContract ? records.find((item) => item.slotIndex === index) : index === 0 ? records[0] : undefined;
    return { index, animal: animal?.animal ?? null, progress: animal?.animal ? progressPercent(animal.growth, LIVESTOCK[animal.animal].cycle) : 0, feed: animal?.feed ?? "normal",
      fedThisCycle: animal?.fedThisCycle, supported: Boolean(animal) };
  });
  return { kind: "livestock", slots, fullContract };
}

export function slotAction(action: PlayerAction, slotIndex: number, fullContract: boolean, modifier?: number, proof?: MinigameProof): PlayerAction {
  if (!fullContract) return action;
  return { ...action, slotIndex, ...(modifier === undefined ? {} : { minigameModifier: Math.max(-0.1, Math.min(0.1, modifier)) }), ...(proof ? { minigameProof: proof } : {}) } as unknown as PlayerAction;
}

export function careAction(type: "WATER_PLOT" | "FEED_STALL", moduleId: string, slotIndex: number, modifier?: number, proof?: MinigameProof): PlayerAction {
  return { type, moduleId, slotIndex, ...(modifier === undefined ? {} : { minigameModifier: Math.max(-0.1, Math.min(0.1, modifier)) }), ...(proof ? { minigameProof: proof } : {}) } as unknown as PlayerAction;
}

export function actionSlotIndex(action: PlayerAction): number {
  return "slotIndex" in action && typeof action.slotIndex === "number" ? action.slotIndex : 0;
}

export function actionCost(action: PlayerAction): number {
  return action.type === "REPAIR" ? 2 : action.type === "END_TURN" ? 0 : 1;
}
