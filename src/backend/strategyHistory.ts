import type { RunTranscript } from "../game/state/transcript.ts";
import { replayTranscript } from "../game/state/transcript.ts";
import type { GameState, TurnRecord } from "../game/state/types.ts";

export type DecisionSummary = {
  plantedByCrop: Record<string, number>;
  harvestedByCrop: Record<string, number>;
  cropSwitches: number;
  parameterChanges: number;
  highLightSelections: number;
  lowWaterSelections: number;
  earlyChanges: number;
  lateChanges: number;
};

export type PressureSummary = {
  pressureTurns: number;
  ordinaryTurns: number;
  cropYieldUnderPressure: number;
  cropYieldWithoutPressure: number;
};

export function summarizeDecisions(transcript: RunTranscript): DecisionSummary {
  const summary: DecisionSummary = { plantedByCrop: {}, harvestedByCrop: {}, cropSwitches: 0,
    parameterChanges: 0, highLightSelections: 0, lowWaterSelections: 0, earlyChanges: 0, lateChanges: 0 };
  let previous: GameState | undefined;
  replayTranscript(transcript, (state, _index, step) => {
    if (step?.kind === "turn" && previous) {
      const selected = new Map(previous.crops.map((plot) => [`${plot.moduleId}:${plot.slotIndex}`, plot.crop]));
      for (const action of step.actions) {
        if (!("moduleId" in action)) continue;
        const key = `${action.moduleId}:${"slotIndex" in action ? action.slotIndex ?? 0 : 0}`;
        if (action.type === "PLANT_CROP") {
          const old = selected.get(key);
          if (old && old !== action.crop) summary.cropSwitches++;
          selected.set(key, action.crop);
          summary.plantedByCrop[action.crop] = (summary.plantedByCrop[action.crop] ?? 0) + 1;
          if (previous.turn <= 5) summary.earlyChanges++; else summary.lateChanges++;
        } else if (action.type === "HARVEST_CROP") {
          const crop = selected.get(key);
          if (crop) summary.harvestedByCrop[crop] = (summary.harvestedByCrop[crop] ?? 0) + 1;
        } else if (action.type === "SET_CROP_PARAMS") {
          summary.parameterChanges++;
          if (action.light === "high") summary.highLightSelections++;
          if (action.water === "low") summary.lowWaterSelections++;
          if (previous.turn <= 5) summary.earlyChanges++; else summary.lateChanges++;
        }
      }
    }
    previous = state;
  });
  return summary;
}

/** Pressure means end-of-turn water or power below 25 game units. */
export function summarizePressure(records: readonly TurnRecord[]): PressureSummary {
  const result: PressureSummary = { pressureTurns: 0, ordinaryTurns: 0, cropYieldUnderPressure: 0, cropYieldWithoutPressure: 0 };
  for (const record of records) {
    if (record.resources.water < 25 || record.resources.power < 25) {
      result.pressureTurns++; result.cropYieldUnderPressure += record.cropYield;
    } else { result.ordinaryTurns++; result.cropYieldWithoutPressure += record.cropYield; }
  }
  return result;
}
