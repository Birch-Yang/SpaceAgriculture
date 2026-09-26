import type { GameState } from "../game/state/types.ts";

export type AgentPublicState = {
  water: "healthy" | "low" | "critical";
  power: "stable" | "unstable" | "critical";
  oxygen: "healthy" | "low" | "critical";
  temperature: "below-target" | "nominal" | "above-target" | "critical";
  agriculture: "ahead" | "on-track" | "behind";
  latestMajorEvent?: string;
};
export type AgentEvent = { type: string; publicState: AgentPublicState; context: string[] };

const level = (value: number): "critical" | "low" | "healthy" => value <= 0 ? "critical" : value < 20 ? "low" : "healthy";

export function toAgentPublicState(state: GameState): AgentPublicState {
  const temperature = state.resources.temperature;
  return {
    water: level(state.resources.water),
    power: state.resources.power <= 0 ? "critical" : state.resources.power < 20 ? "unstable" : "stable",
    oxygen: level(state.resources.oxygen),
    temperature: temperature < 5 || temperature > 35 ? "critical" : temperature < 16 ? "below-target" : temperature > 26 ? "above-target" : "nominal",
    agriculture: state.production.cropCumulative + state.production.meatCumulative > state.turn * 3 ? "ahead" : state.production.cropCumulative + state.production.meatCumulative > state.turn ? "on-track" : "behind",
    ...(state.lastTurn?.hazard ? { latestMajorEvent: state.lastTurn.hazard.type } : {}),
  };
}

export function deriveAgentEvent(state: GameState): AgentEvent | undefined {
  if (state.activeHazard?.type === "communications") return undefined;
  const publicState = toAgentPublicState(state);
  if (state.crisis?.trigger.includes("water")) return { type: "WATER_CRISIS", publicState, context: ["Water reserve is critical"] };
  if (state.history.some((event) => event.type === "CROP_YIELD") && state.history.filter((event) => event.type === "CROP_YIELD").length === 1 && state.lastTurn?.cropYield) return { type: "CROP_YIELD_MILESTONE", publicState, context: ["First harvest recorded"] };
  if (state.lastTurn?.hazard?.type === "power") return { type: "POWER_INSTABILITY", publicState, context: ["Recent power hazard"] };
  if (publicState.agriculture === "behind" && state.turn % 3 === 0) return { type: "CROP_OUTPUT_BEHIND", publicState, context: ["Production pace is behind"] };
  return undefined;
}
