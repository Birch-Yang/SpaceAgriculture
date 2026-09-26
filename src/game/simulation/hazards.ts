import { DIFFICULTY } from "../../data/difficulty.ts";
import { HAZARDS } from "../../data/hazards.ts";
import type { GameState, HazardInstance, HazardType } from "../state/types.ts";

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

export function isCommunicationsOutage(state: GameState): boolean {
  return state.activeHazard?.type === "communications";
}
