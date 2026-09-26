import { replayTranscript, type RunStep, type RunTranscript } from "./transcript.ts";
import type { GameState } from "./types.ts";

export type ReplayFrame = {
  index: number;
  kind: "initial" | RunStep["kind"];
  action?: string;
  level: GameState["level"];
  turn: number;
  phase: GameState["phase"];
  budget: number;
  resources: GameState["resources"];
  production: GameState["production"];
  modules: GameState["modules"];
  utilityEdges: GameState["utilityEdges"];
  crops: GameState["crops"];
  livestock: GameState["livestock"];
  hazard?: GameState["activeHazard"];
  crisis?: GameState["crisis"];
};

/** Materialized, immutable snapshots for a saved run. No messaging session data is included. */
export function createReplayFrames(transcript: RunTranscript): ReplayFrame[] {
  const frames: ReplayFrame[] = [];
  replayTranscript(transcript, (state, index, step) => {
    frames.push({
      index, kind: step?.kind ?? "initial", ...(step?.kind === "build" ? { action: step.action.type } : {}),
      level: state.level, turn: step?.kind === "turn" ? (state.lastTurn?.turn ?? state.turn) : state.turn, phase: state.phase, budget: state.budget,
      resources: { ...state.resources }, production: { ...state.production },
      modules: state.modules.map((module) => ({ ...module, ...(module.allocation ? { allocation: { ...module.allocation } } : {}) })),
      utilityEdges: state.utilityEdges.map((edge) => ({ ...edge, cells: edge.cells.map((cell) => ({ ...cell })) })),
      crops: state.crops.map((crop) => ({ ...crop })), livestock: state.livestock.map((animal) => ({ ...animal })),
      ...((step?.kind === "turn" ? state.lastTurn?.hazard : state.activeHazard)
        ? { hazard: { ...(step?.kind === "turn" ? state.lastTurn!.hazard! : state.activeHazard!) } } : {}),
      ...(state.crisis ? { crisis: { ...state.crisis } } : {}),
    });
  });
  return frames;
}
