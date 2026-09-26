import type { GameState } from "../game/state/types.ts";
import { communicationsAvailable } from "../data/systems.ts";
import { deriveAgentEvent, type AgentEvent } from "./publicState.ts";

export type MissionControlMessage = { status: "sent" | "unavailable" | "no-event"; text?: string; event?: AgentEvent };
export type PhotonAdapter = { sendEvent(event: AgentEvent): Promise<string> };

// Adapter boundary: the Photon provider/credentials will be wired here when the team provisions a Spectrum project.
export async function missionControlForTurn(state: GameState, adapter?: PhotonAdapter): Promise<MissionControlMessage> {
  if (!communicationsAvailable(state)) return { status: "unavailable", text: "Mission Control communication lost" };
  const event = deriveAgentEvent(state);
  if (!event) return { status: "no-event" };
  if (!adapter) return { status: "unavailable", text: "Mission Control temporarily unavailable", event };
  try { return { status: "sent", text: await adapter.sendEvent(event), event }; }
  catch { return { status: "unavailable", text: "Mission Control temporarily unavailable", event }; }
}
