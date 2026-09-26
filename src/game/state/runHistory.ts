import { MODULE_BY_ID } from "../../data/modules.ts";
import type { PlayerAction, TurnRecord } from "./types.ts";
import type { RunTranscript } from "./transcript.ts";
import type { ReplayFrame } from "./replayFrames.ts";

export type JournalEntry = { frameIndex: number; label: string; kind: "build" | "start" | "turn" | "advance";
  actions: string[]; level: number; turn: number; hazard?: string; crisis?: string };
export type TimelineEntry = { frameIndex: number; label: string; detail: string; level: number; turn: number;
  kind: "hazard" | "crisis" | "recovery" };

const moduleName = (id: string) => MODULE_BY_ID.get(id)?.label ?? id.replaceAll("-", " ");
const targetName = (id: string, before: ReplayFrame) =>
  moduleName(before.modules.find((module) => module.id === id)?.moduleId ?? id);
const slotName = (action: { slotIndex?: number }) => `slot ${(action.slotIndex ?? 0) + 1}`;

export function describePlayerAction(action: PlayerAction, before: ReplayFrame): string {
  switch (action.type) {
    case "PLACE_MODULE": return `Built ${moduleName(action.moduleId)} at (${action.x}, ${action.y})`;
    case "REMOVE_MODULE": return `Removed ${targetName(action.placedModuleId, before)}`;
    case "MOVE_MODULE": return `Moved ${targetName(action.placedModuleId, before)} to (${action.x}, ${action.y})`;
    case "PLACE_CORRIDOR": return `Connected modules with ${action.cells.length} corridor cell${action.cells.length === 1 ? "" : "s"}`;
    case "REMOVE_CORRIDOR": return `Removed corridor ${action.edgeId}`;
    case "SET_CROP_PARAMS": return `Set crop ${slotName(action)}: ${action.water} water, ${action.light} light, ${action.temperature} temperature`;
    case "SET_LIVESTOCK_PARAMS": return `Set livestock ${slotName(action)} to ${action.feed} feed`;
    case "REALLOCATE_UTILITY": return `Reallocated ${targetName(action.moduleId, before)}: ${Math.round(action.allocation.thermal * 100)}% thermal, ${Math.round(action.allocation.backupPower * 100)}% backup power, ${Math.round(action.allocation.commsBackup * 100)}% communications`;
    case "REPAIR": return `Repaired ${targetName(action.targetId, before)}`;
    case "PLANT_CROP": return `Planted ${action.crop.replaceAll("-", " ")} in crop ${slotName(action)}`;
    case "HARVEST_CROP": return `Harvested crop ${slotName(action)}`;
    case "SET_ANIMAL": return `Assigned ${action.animal} to livestock ${slotName(action)}`;
    case "WATER_PLOT": return `Watered crop ${slotName(action)}`;
    case "FEED_STALL": return `Fed livestock ${slotName(action)}`;
    case "END_TURN": return "Ended turn";
  }
}

export function createRunHistory(transcript: RunTranscript, frames: ReplayFrame[], turnRecords: TurnRecord[]):
  { journal: JournalEntry[]; timeline: TimelineEntry[] } {
  if (frames.length !== transcript.steps.length + 1) throw new Error("Incomplete replay frames");
  const records = new Map(turnRecords.map((record) => [`${record.level}:${record.turn}`, record]));
  const journal: JournalEntry[] = [];
  const timeline: TimelineEntry[] = [];
  let priorCrisis = false;
  transcript.steps.forEach((step, index) => {
    const before = frames[index];
    const after = frames[index + 1];
    const frameIndex = index + 1;
    const record = step.kind === "turn" ? records.get(`${before.level}:${before.turn}`) : undefined;
    const actions = step.kind === "build" ? [describePlayerAction(step.action, before)]
      : step.kind === "turn" ? step.actions.filter((action) => action.type !== "END_TURN")
        .map((action) => describePlayerAction(action, before)) : [];
    journal.push({ frameIndex, kind: step.kind, level: before.level, turn: before.turn,
      label: step.kind === "build" ? "Base construction" : step.kind === "start" ? `Level ${before.level} began`
        : step.kind === "advance" ? `Advanced to level ${after.level}` : `Level ${before.level} · turn ${before.turn}`,
      actions: actions.length ? actions : [step.kind === "turn" ? "No actions queued; turn ended" : step.kind === "start" ? "Operations started" : "Next stage unlocked"],
      ...(record?.hazard ? { hazard: `${record.hazard.type.replaceAll("-", " ")} · severity ${record.hazard.severity.toFixed(1)}` } : {}),
      ...(record?.crisis ? { crisis: "Critical resource condition" } : {}),
    });
    if (!record) return;
    if (record.hazard) timeline.push({ frameIndex, level: record.level, turn: record.turn, kind: "hazard",
      label: record.hazard.type.replaceAll("-", " "),
      detail: `Severity ${record.hazard.severity.toFixed(1)}. Crop yield ${record.cropYield}; meat yield ${record.meatYield}.${record.crisis ? " A resource crisis followed." : ""}` });
    if (record.crisis && !record.hazard) timeline.push({ frameIndex, level: record.level, turn: record.turn,
      kind: "crisis", label: "Resource crisis", detail: "One or more critical resource conditions were recorded after this turn." });
    if (priorCrisis && !record.crisis) timeline.push({ frameIndex, level: record.level, turn: record.turn,
      kind: "recovery", label: "Crisis cleared", detail: "The critical resource condition was no longer active after this turn." });
    priorCrisis = record.crisis;
  });
  return { journal, timeline };
}
