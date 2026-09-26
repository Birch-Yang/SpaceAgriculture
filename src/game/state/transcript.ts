import { MODULE_BY_ID } from "../../data/modules.ts";
import { isCropId } from "../../data/cropCatalog.ts";
import { advanceLevel, applyBuildAction, createInitialState, startOperation } from "./reducer.ts";
import { resolveTurn } from "../simulation/resolveTurn.ts";
import { seedForLevel } from "../simulation/hazards.ts";
import { scoreMinigameProof, type MinigameProof } from "../minigames/proof.ts";
import type { GameMode, GameState, PlayerAction } from "./types.ts";

export type RunStep =
  | { kind: "build"; action: PlayerAction }
  | { kind: "start" }
  | { kind: "turn"; actions: PlayerAction[] }
  | { kind: "advance" };
export type RunTranscript = { version: 1 | 2; runId: string; nickname: string; mode: GameMode; steps: RunStep[] };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const settings = new Set(["low", "medium", "high"]);
const animals = new Set(["chicken", "pig", "cow"]);
const feeds = new Set(["rationed", "normal", "high"]);
const rotations = new Set([0]);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown, max = 100): value is string => typeof value === "string" && value.length > 0 && value.length <= max;
const oneOf = (options: Set<string>, value: unknown): boolean => typeof value === "string" && options.has(value);
const slot = (value: unknown): boolean => value === undefined || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 2);
const modifier = (value: unknown): boolean => value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= -0.1 && value <= 0.1);

function verifiedModifier(value: Record<string, unknown>, kind: MinigameProof["kind"]): boolean {
  if (!modifier(value.minigameModifier)) return false;
  if (value.minigameProof === undefined) return value.minigameModifier === undefined || value.minigameModifier === 0;
  const computed = scoreMinigameProof(value.minigameProof, kind);
  return computed !== null && typeof value.minigameModifier === "number"
    && Math.abs(computed - value.minigameModifier) < 1e-9;
}

function validAction(value: unknown, build: boolean): value is PlayerAction {
  if (!record(value) || typeof value.type !== "string") return false;
  if (build) {
    if (value.type === "PLACE_MODULE") return string(value.moduleId) && MODULE_BY_ID.has(value.moduleId)
      && Number.isInteger(value.x) && Number(value.x) >= 0 && Number(value.x) < 14
      && Number.isInteger(value.y) && Number(value.y) >= 0 && Number(value.y) < 14 && rotations.has(Number(value.rotation));
    if (value.type === "REMOVE_MODULE") return string(value.placedModuleId);
    if (value.type === "MOVE_MODULE") return string(value.placedModuleId) && Number.isInteger(value.x) && Number(value.x) >= 0 && Number(value.x) < 14
      && Number.isInteger(value.y) && Number(value.y) >= 0 && Number(value.y) < 14;
    if (value.type === "REMOVE_CORRIDOR") return string(value.edgeId);
    if (value.type === "PLACE_CORRIDOR") return Array.isArray(value.cells) && value.cells.length > 0 && value.cells.length <= 196
      && value.cells.every((cell) => record(cell) && Number.isInteger(cell.x) && Number(cell.x) >= 0 && Number(cell.x) < 14
        && Number.isInteger(cell.y) && Number(cell.y) >= 0 && Number(cell.y) < 14);
    return false;
  }
  if (value.type === "END_TURN") return true;
  if (value.type === "REPAIR") return string(value.targetId) && verifiedModifier(value, "repair");
  if (value.type === "REALLOCATE_UTILITY") {
    if (!string(value.moduleId) || !record(value.allocation)) return false;
    const a = value.allocation;
    return [a.thermal, a.backupPower, a.commsBackup].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1)
      && Math.abs(Number(a.thermal) + Number(a.backupPower) + Number(a.commsBackup) - 1) < 0.001;
  }
  if (!string(value.moduleId) || !slot(value.slotIndex)) return false;
  if (value.type === "SET_CROP_PARAMS") return oneOf(settings, value.water) && oneOf(settings, value.light) && oneOf(settings, value.temperature);
  if (value.type === "SET_LIVESTOCK_PARAMS") return oneOf(feeds, value.feed);
  if (value.type === "PLANT_CROP") return isCropId(value.crop);
  if (value.type === "HARVEST_CROP") return verifiedModifier(value, "match3");
  if (value.type === "SET_ANIMAL") return oneOf(animals, value.animal);
  if (value.type === "WATER_PLOT") return Number.isInteger(value.slotIndex);
  if (value.type === "FEED_STALL") return Number.isInteger(value.slotIndex) && verifiedModifier(value, "match3");
  return false;
}

export function parseTranscript(value: unknown): RunTranscript {
  if (!record(value) || (value.version !== 1 && value.version !== 2) || !string(value.runId, 36) || !uuid.test(value.runId)
    || !string(value.nickname, 32) || !value.nickname.trim() || !["challenge", "progressive"].includes(String(value.mode))
    || !Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 500) throw new Error("Invalid run transcript");
  for (const step of value.steps) {
    if (!record(step)) throw new Error("Invalid run step");
    if (step.kind === "build" && validAction(step.action, true)) continue;
    if (step.kind === "start" || step.kind === "advance") continue;
    if (step.kind === "turn" && Array.isArray(step.actions) && step.actions.length <= 20
      && step.actions.every((action) => validAction(action, false))
      && !step.actions.slice(0, -1).some((action) => action.type === "END_TURN")) continue;
    throw new Error("Invalid run step");
  }
  return value as RunTranscript;
}

export function replayTranscript(transcript: RunTranscript, onStep?: (state: GameState, index: number, step?: RunStep) => void): GameState {
  parseTranscript(transcript);
  let state = createInitialState(transcript.runId, transcript.nickname, transcript.mode, transcript.version);
  let turnCount = 0;
  onStep?.(state, -1);
  for (const [index, step] of transcript.steps.entries()) {
    if (step.kind === "build") {
      const result = applyBuildAction(state, step.action);
      if (result.error) throw new Error(`Invalid build action: ${result.error}`);
      state = result.state;
    } else if (step.kind === "start") {
      state = startOperation(state);
    } else if (step.kind === "advance") {
      state = advanceLevel(state);
    } else {
      if (++turnCount > 30) throw new Error("Too many turns");
      const result = resolveTurn(state, step.actions, seedForLevel(state));
      if (result.rejectedActions.length) throw new Error(`Rejected action: ${result.rejectedActions[0]}`);
      state = result.state;
    }
    onStep?.(state, index, step);
  }
  if (state.phase !== "complete") throw new Error("Run is not complete");
  return state;
}
