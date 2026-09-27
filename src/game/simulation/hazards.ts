import { DIFFICULTY } from "../../data/difficulty.ts";
import { HAZARDS } from "../../data/hazards.ts";
import { HAZARD_AVOIDANCE } from "../../data/hazardAvoidance.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import { communicationsAvailable, connectedToHabitat } from "../../data/systems.ts";
import type { ForecastState, GameState, HazardInstance, HazardType } from "../state/types.ts";

function hash(input: string): number {
  let result = 2166136261;
  for (const char of input) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

export function hazardSchedule(state: Pick<GameState, "mode" | "level">, rngSeed: string): HazardInstance[] {
  const pressure = DIFFICULTY[state.mode][state.level - 1].hazardPressure;
  const types = Object.keys(HAZARDS) as HazardType[];
  const count = pressure < 50 ? 2 : pressure < 80 ? 3 : 5;
  const baseTurns = pressure < 50 ? [4, 8] : pressure < 80 ? [3, 6, 9] : [2, 4, 6, 8, 10];
  const events = baseTurns.slice(0, count).map((turn, index) => {
    const roll = hash(`${rngSeed}:${state.level}:${index}`);
    const type = types[roll % types.length];
    return { id: `hazard-${state.level}-${index}`, type, severity: 0.8 + (roll % 5) * 0.1, turn };
  });
  const total = events.reduce((sum, event) => sum + HAZARDS[event.type].pressure * event.severity, 0);
  const scaling = total > 0 ? pressure / total : 1;
  return events.map((event) => ({ ...event, severity: Math.round(event.severity * scaling * 100) / 100 }));
}

export function hazardForTurn(state: GameState, rngSeed: string): HazardInstance | undefined {
  return hazardSchedule(state, rngSeed).find((event) => event.turn === state.turn);
}

/** Hidden defenses are evaluated from the state entering the turn, before any queued actions. */
export function preemptivelyAvoided(state: GameState, hazard: HazardInstance): boolean {
  const connectedIntact = (category: string, integrity: number) => state.modules.some((module) =>
    MODULE_BY_ID.get(module.moduleId)?.category === category
    && module.integrity >= integrity && connectedToHabitat(state, module.id));
  const preparedShelter = connectedIntact("shelter", HAZARD_AVOIDANCE.shelterIntegrity);

  if (hazard.type === "temperature") {
    const previous = [...state.turnRecords].reverse().find((record) => record.level === state.level && record.turn === hazard.turn - 1);
    return !!previous
      && previous.resources.temperature >= HAZARD_AVOIDANCE.stableTemperatureMin
      && previous.resources.temperature <= HAZARD_AVOIDANCE.stableTemperatureMax
      && state.resources.power >= HAZARD_AVOIDANCE.temperaturePowerReserve
      && state.modules.some((module) => MODULE_BY_ID.get(module.moduleId)?.category === "utility"
        && module.integrity >= HAZARD_AVOIDANCE.minimumIntegrity
        && (module.allocation?.thermal ?? 0) >= HAZARD_AVOIDANCE.thermalAllocation
        && connectedToHabitat(state, module.id));
  }
  if (hazard.type === "radiation")
    return preparedShelter && state.resources.oxygen >= HAZARD_AVOIDANCE.radiationOxygenReserve;
  if (hazard.type === "micrometeoroid")
    return preparedShelter && state.modules.every((module) => module.integrity >= HAZARD_AVOIDANCE.impactBaseIntegrity);
  if (hazard.type === "communications")
    return state.resources.power >= HAZARD_AVOIDANCE.communicationsPowerReserve
      && connectedIntact("communications", HAZARD_AVOIDANCE.minimumIntegrity)
      && state.modules.some((module) => MODULE_BY_ID.get(module.moduleId)?.category === "utility"
        && module.integrity >= HAZARD_AVOIDANCE.minimumIntegrity
        && (module.allocation?.commsBackup ?? 0) >= HAZARD_AVOIDANCE.communicationsBackupAllocation
        && connectedToHabitat(state, module.id));
  return state.resources.power >= HAZARD_AVOIDANCE.powerReserve
    && connectedIntact("battery", HAZARD_AVOIDANCE.minimumIntegrity);
}

export function isCommunicationsOutage(state: GameState): boolean {
  return !communicationsAvailable(state);
}

export function seedForLevel(state: Pick<GameState, "runId" | "level">): string {
  return `${state.runId}:${state.level}`;
}

/** Fuzzy risk bands derived from the same hidden schedule used by resolveTurn. */
export function forecastForTurn(state: Pick<GameState, "runId" | "mode" | "level" | "turn">): ForecastState {
  const upcoming = hazardSchedule(state, seedForLevel(state))
    .filter((event) => event.turn >= state.turn && event.turn < state.turn + 3);
  const band = (types: HazardType[]) => {
    const severity = Math.max(0, ...upcoming.filter((event) => types.includes(event.type)).map((event) => event.severity));
    return severity >= 1.2 ? "Elevated" : severity > 0 ? "Moderate" : "Low";
  };
  return { solar: band(["radiation"]), thermal: band(["temperature"]), impact: band(["micrometeoroid"]),
    systems: band(["power", "communications"]), window: `Turns ${state.turn}–${Math.min(10, state.turn + 2)}` };
}
