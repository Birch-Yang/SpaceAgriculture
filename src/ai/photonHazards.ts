import type { GameState } from "../game/state/types.ts";
import { communicationsAvailable } from "../data/systems.ts";
import { toAgentPublicState, type AgentEvent } from "./publicState.ts";

export function photonHazardAlert(state: GameState): AgentEvent | undefined {
  const hazard = state.lastTurn?.hazard;
  if (!hazard || !communicationsAvailable(state)) return undefined;
  return {
    type: `HAZARD_${hazard.type.toUpperCase()}`,
    publicState: toAgentPublicState(state),
    context: [],
  };
}
