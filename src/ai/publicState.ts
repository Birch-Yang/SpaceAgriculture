import type { GameState } from "../game/state/types.ts";
import { communicationsAvailable } from "../data/systems.ts";
import { DIFFICULTY } from "../data/difficulty.ts";

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
  if (!communicationsAvailable(state)) return undefined;
  const publicState = toAgentPublicState(state);
  if (state.crisis?.trigger.includes("water")) return { type: "WATER_CRISIS", publicState, context: ["Water reserve is critical"] };
  if (state.lastTurn?.warnings.includes("Crisis recovered")) return { type: "CRISIS_RECOVERY", publicState, context: ["Critical systems recovered"] };
  if (state.history.some((event) => event.type === "CROP_YIELD") && state.history.filter((event) => event.type === "CROP_YIELD").length === 1 && state.lastTurn?.cropYield) return { type: "CROP_YIELD_MILESTONE", publicState, context: ["First harvest recorded"] };
  if (state.history.filter((event) => event.type === "MEAT_YIELD").length === 1 && state.lastTurn?.meatYield) return { type: "MEAT_YIELD_MILESTONE", publicState, context: ["First livestock output recorded"] };
  const target = DIFFICULTY[state.mode][state.level - 1];
  if (state.lastTurn && state.production.cropCumulative >= target.cropTarget && state.production.meatCumulative >= target.meatTarget
    && state.production.cropCumulative - state.lastTurn.cropYield < target.cropTarget)
    return { type: "PRODUCTION_TARGET_REACHED", publicState, context: ["Agricultural targets reached"] };
  if (state.lastTurn?.hazard?.type === "power") return { type: "POWER_INSTABILITY", publicState, context: ["Recent power hazard"] };
  if (publicState.temperature === "critical") return { type: "THERMAL_CONFIGURATION", publicState, context: ["Thermal conditions outside survival band"] };
  if (publicState.agriculture === "behind" && state.turn % 3 === 0) return { type: "CROP_OUTPUT_BEHIND", publicState, context: ["Production pace is behind"] };
  return undefined;
}

export function validAgentPublicState(value: unknown): value is AgentPublicState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return ["healthy", "low", "critical"].includes(String(state.water))
    && ["stable", "unstable", "critical"].includes(String(state.power))
    && ["healthy", "low", "critical"].includes(String(state.oxygen))
    && ["below-target", "nominal", "above-target", "critical"].includes(String(state.temperature))
    && ["ahead", "on-track", "behind"].includes(String(state.agriculture))
    && (state.latestMajorEvent === undefined || ["temperature", "radiation", "micrometeoroid", "communications", "power"].includes(String(state.latestMajorEvent)));
}
