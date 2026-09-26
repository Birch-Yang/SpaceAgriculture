import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifySpectrumWebhook } from "../src/ai/webhookSignature.ts";
import { fallbackReport } from "../src/ai/report.ts";
import { buildRunSummary } from "../src/ai/schemas.ts";
import { verifiedSources } from "../src/ai/sourceAdapter.ts";
import { communicationsAvailable, resourceCapacity } from "../src/data/systems.ts";
import { DIFFICULTY } from "../src/data/difficulty.ts";
import { HAZARDS } from "../src/data/hazards.ts";
import { LIVESTOCK } from "../src/data/livestock.ts";
import { transcriptHash } from "../src/backend/submissions.ts";
import { harvestCrop } from "../src/game/simulation/crops.ts";
import { growLivestock } from "../src/game/simulation/livestock.ts";
import { hazardSchedule, seedForLevel } from "../src/game/simulation/hazards.ts";
import { maxActionPoints, resolveTurn } from "../src/game/simulation/resolveTurn.ts";
import { resolveUtilityGraph } from "../src/game/simulation/utilityGraph.ts";
import { advanceLevel, applyBuildAction, createInitialState, startOperation } from "../src/game/state/reducer.ts";
import { parseTranscript, replayTranscript, type RunTranscript } from "../src/game/state/transcript.ts";
import type { GameState, PlayerAction } from "../src/game/state/types.ts";

const moduleActions: PlayerAction[] = [
  { type: "PLACE_MODULE", moduleId: "habitat-core", x: 0, y: 0, rotation: 0 },
  { type: "PLACE_MODULE", moduleId: "solar-array", x: 3, y: 0, rotation: 0 },
  { type: "PLACE_MODULE", moduleId: "oxygen-generator", x: 3, y: 3, rotation: 0 },
  { type: "PLACE_MODULE", moduleId: "water-recycler", x: 0, y: 4, rotation: 0 },
  { type: "PLACE_MODULE", moduleId: "greenhouse-standard", x: 6, y: 0, rotation: 0 },
  { type: "PLACE_MODULE", moduleId: "livestock-compact", x: 6, y: 3, rotation: 0 },
  ...[[[{ x: 2, y: 0 }]], [[{ x: 3, y: 2 }]], [[{ x: 0, y: 2 }, { x: 0, y: 3 }]], [[{ x: 5, y: 0 }]], [[{ x: 6, y: 2 }]]]
    .map(([cells]) => ({ type: "PLACE_CORRIDOR" as const, cells })),
];

function base(mode: "challenge" | "progressive" = "challenge"): GameState {
  let state = createInitialState("11111111-1111-4111-8111-111111111111", "Replay tester", mode);
  for (const action of moduleActions) {
    const result = applyBuildAction(state, action);
    assert.equal(result.error, undefined);
    state = result.state;
  }
  return state;
}

test("a complete transcript replays to the same authoritative state and rejects forged actions", () => {
  let state = startOperation(base());
  const steps: RunTranscript["steps"] = [...moduleActions.map((action) => ({ kind: "build" as const, action })), { kind: "start" }];
  for (let i = 0; i < 10 && state.phase === "operation"; i++) {
    const greenhouse = state.modules.find((module) => module.moduleId === "greenhouse-standard")!;
    const actions: PlayerAction[] = state.crops.find((crop) => crop.moduleId === greenhouse.id && crop.ready)
      ? [{ type: "HARVEST_CROP", moduleId: greenhouse.id, slotIndex: 0 }] : [];
    const result = resolveTurn(state, [...actions, { type: "END_TURN" }], seedForLevel(state));
    steps.push({ kind: "turn", actions: result.acceptedActions });
    state = result.state;
  }
  const transcript: RunTranscript = { version: 1, runId: state.runId, nickname: state.nickname, mode: "challenge", steps };
  assert.equal(state.phase, "complete");
  assert.deepEqual(replayTranscript(parseTranscript(transcript)), state);
  assert.notEqual(transcriptHash(transcript), transcriptHash({ ...transcript, steps: transcript.steps.slice(0, -1) }));
  assert.throws(() => parseTranscript({ ...transcript, steps: [{ kind: "turn", actions: [{ type: "REPAIR", targetId: "fake", minigameModifier: 99 }] }] }));
  assert.throws(() => parseTranscript({ ...transcript, steps: [{ kind: "build", action: { type: "PLACE_MODULE", moduleId: "habitat-core", x: 0, y: 0, rotation: 90 } }] }));
  assert.throws(() => replayTranscript({ ...transcript, steps: [...steps, { kind: "turn", actions: [] }] }));
  const report = fallbackReport(buildRunSummary(state), !!state.passed, verifiedSources);
  assert.ok(report.sourceIds.length > 0);
  assert.ok(report.sourceIds.every((id) => verifiedSources.some((source) => source.id === id)));
});

test("corridor isolation and capacity change actual delivery; connected storage caps reserves", () => {
  const connected = base();
  const greenhouse = connected.modules.find((module) => module.moduleId === "greenhouse-standard")!;
  const full = resolveUtilityGraph(connected);
  const narrow = structuredClone(connected);
  narrow.utilityEdges = narrow.utilityEdges.map((edge) => ({ ...edge, capacity: 1 }));
  assert.ok((full.delivery[greenhouse.id].power ?? 0) > (resolveUtilityGraph(narrow).delivery[greenhouse.id].power ?? 0));
  const isolated = structuredClone(connected);
  isolated.utilityEdges = [];
  isolated.resources.power = 0;
  assert.equal(resolveUtilityGraph(isolated).net.power, 0);
  const operating = startOperation(connected);
  operating.resources.water = 999;
  const result = resolveTurn(operating, [], "storage-test");
  assert.ok(result.state.resources.water <= resourceCapacity(result.state, "water"));
});

test("intermission can remove and reroute corridors before moving a disconnected module", () => {
  let state = base("progressive");
  const water = state.modules.find((module) => module.moduleId === "water-recycler")!;
  const move: PlayerAction = { type: "MOVE_MODULE", placedModuleId: water.id, x: 0, y: 8 };
  assert.match(applyBuildAction(state, move).error ?? "", /corridors/);
  const edge = state.utilityEdges.find((item) => item.from === water.id || item.to === water.id)!;
  const remove = applyBuildAction(state, { type: "REMOVE_CORRIDOR", edgeId: edge.id });
  assert.equal(remove.error, undefined);
  state = remove.state;
  const moved = applyBuildAction(state, move);
  assert.equal(moved.error, undefined);
  state = moved.state;
  const path = applyBuildAction(state, { type: "PLACE_CORRIDOR", cells: Array.from({ length: 6 }, (_, i) => ({ x: 0, y: i + 2 })) });
  assert.equal(path.error, undefined);
  assert.ok(path.state.utilityEdges.some((item) => item.from === water.id || item.to === water.id));
});

test("a connected recreation module improves AP recovery while food scarcity still matters", () => {
  const ordinary = startOperation(base());
  const extra = structuredClone(ordinary);
  extra.modules.push({ id: "module-recreation", moduleId: "recreation", x: 11, y: 10, rotation: 0, integrity: 1 });
  extra.utilityEdges.push({ id: "edge-recreation", from: extra.modules[0].id, to: "module-recreation", cells: [{ x: 10, y: 10 }], length: 1, capacity: 20, integrity: 1 });
  assert.equal(maxActionPoints(extra), maxActionPoints(ordinary) + 1);
  assert.equal(resolveTurn(extra, [], "recreation").state.ap, resolveTurn(ordinary, [], "recreation").state.ap + 1);
  extra.resources.food = 0;
  assert.ok(resolveTurn(extra, [], "recreation").state.ap < maxActionPoints(extra));
});

test("a connected communications tower boosts utility backup during an outage", () => {
  const state = base();
  state.activeHazard = { id: "comms-test", type: "communications", severity: 1, turn: 2 };
  state.modules.push({ id: "module-utility", moduleId: "utility-thermal", x: 10, y: 8, rotation: 0, integrity: 1,
    allocation: { thermal: 0.5, backupPower: 0.3, commsBackup: 0.2 } });
  state.utilityEdges.push({ id: "edge-utility", from: state.modules[0].id, to: "module-utility", cells: [{ x: 10, y: 7 }], length: 1, capacity: 20, integrity: 1 });
  assert.equal(communicationsAvailable(state), false);
  state.modules.push({ id: "module-tower", moduleId: "communication-tower", x: 11, y: 8, rotation: 0, integrity: 1 });
  state.utilityEdges.push({ id: "edge-tower", from: "module-utility", to: "module-tower", cells: [{ x: 11, y: 7 }], length: 1, capacity: 20, integrity: 1 });
  assert.equal(communicationsAvailable(state), true);
  state.utilityEdges.pop();
  assert.equal(communicationsAvailable(state), false);
});

test("all three crops and livestock species produce through the connected base", () => {
  const state = startOperation(base());
  const network = resolveUtilityGraph(state);
  const plot = { ...state.crops[0], ready: true };
  for (const crop of ["lettuce", "potato", "wheat"] as const)
    assert.ok(harvestCrop(state, { ...plot, crop }, network).yield > 0, crop);
  const low = harvestCrop(state, { ...plot, crop: "lettuce", water: "low", light: "low" }, network).yield;
  const high = harvestCrop(state, { ...plot, crop: "lettuce", water: "high", light: "high" }, network).yield;
  assert.ok(high > low);
  for (const animal of ["chicken", "pig", "cow"] as const) {
    const candidate = structuredClone(state);
    candidate.livestock[0].animal = animal;
    candidate.livestock[0].growth = LIVESTOCK[animal].cycle;
    assert.ok(growLivestock(candidate, network).meatYield > 0, animal);
  }
});

test("Spectrum webhook signature accepts current raw content and rejects tampering or replay", () => {
  const body = JSON.stringify({ event: "messages", message: { id: "one" } });
  const secret = "a-private-test-secret";
  const now = 1_800_000_000_000;
  const timestamp = String(Math.floor(now / 1000));
  const signature = createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex");
  const headers = new Headers({ "x-spectrum-timestamp": timestamp, "x-spectrum-signature": `v0=${signature}` });
  assert.equal(verifySpectrumWebhook(body, headers, secret, now), true);
  assert.equal(verifySpectrumWebhook(body + " ", headers, secret, now), false);
  assert.equal(verifySpectrumWebhook(body, headers, secret, now + 301_000), false);
});

test("each level keeps a fixed hazard schedule near its pressure budget", () => {
  const state = base("progressive");
  for (const level of [1, 2, 3] as const) {
    const context = { ...state, level };
    const schedule = hazardSchedule(context, seedForLevel(context));
    assert.deepEqual(schedule, hazardSchedule(context, seedForLevel(context)));
    const pressure = schedule.reduce((sum, hazard) => sum + HAZARDS[hazard.type].pressure * hazard.severity, 0);
    assert.ok(Math.abs(pressure - DIFFICULTY.progressive[level - 1].hazardPressure) < 1, `Level ${level}: ${pressure}`);
  }
});

test("progressive mode carries one base through three ten-turn levels", () => {
  let state = startOperation(base("progressive"));
  const steps: RunTranscript["steps"] = [...moduleActions.map((action) => ({ kind: "build" as const, action })), { kind: "start" }];
  function addBuild(action: PlayerAction) {
    const result = applyBuildAction(state, action);
    assert.equal(result.error, undefined);
    state = result.state;
    steps.push({ kind: "build", action });
  }
  let resolved = 0;
  while (state.phase === "operation" && resolved < 30) {
    const greenhouse = state.modules.find((module) => module.moduleId === "greenhouse-standard")!;
    const actions: PlayerAction[] = state.crops.filter((crop) => crop.ready)
      .map((crop) => ({ type: "HARVEST_CROP", moduleId: crop.moduleId, slotIndex: crop.slotIndex }));
    if (resolved === 0) actions.push({ type: "PLANT_CROP", moduleId: greenhouse.id, slotIndex: 1, crop: "lettuce" });
    const result = resolveTurn(state, actions, seedForLevel(state));
    state = result.state;
    steps.push({ kind: "turn", actions: result.acceptedActions });
    resolved++;
    if (state.phase === "intermission") {
      state = advanceLevel(state);
      steps.push({ kind: "advance" });
      if (state.level === 2) {
        addBuild({ type: "PLACE_MODULE", moduleId: "greenhouse-compact", x: 10, y: 0, rotation: 0 });
        addBuild({ type: "PLACE_CORRIDOR", cells: [{ x: 9, y: 0 }] });
        addBuild({ type: "PLACE_MODULE", moduleId: "solar-array", x: 3, y: 5, rotation: 0 });
        addBuild({ type: "PLACE_CORRIDOR", cells: [{ x: 3, y: 4 }] });
        addBuild({ type: "PLACE_MODULE", moduleId: "water-recycler", x: 0, y: 7, rotation: 0 });
        addBuild({ type: "PLACE_CORRIDOR", cells: [{ x: 0, y: 5 }, { x: 0, y: 6 }] });
        addBuild({ type: "PLACE_MODULE", moduleId: "solar-array", x: 1, y: 2, rotation: 0 });
        addBuild({ type: "PLACE_CORRIDOR", cells: [{ x: 2, y: 1 }] });
      }
      if (state.level === 3) {
        addBuild({ type: "PLACE_MODULE", moduleId: "solar-array", x: 6, y: 5, rotation: 0 });
        addBuild({ type: "PLACE_CORRIDOR", cells: [{ x: 5, y: 5 }] });
      }
      state = startOperation(state);
      steps.push({ kind: "start" });
    }
  }
  assert.equal(resolved, 30, `${state.failureReason}; resources=${JSON.stringify(state.resources)}; last=${JSON.stringify(state.turnRecords.slice(-3))}`);
  assert.equal(state.level, 3);
  assert.equal(state.phase, "complete");
  assert.equal(state.passed, true, `${state.failureReason}; production=${JSON.stringify(state.production)}`);
  assert.equal(state.turnRecords.length, 30);
  assert.deepEqual(replayTranscript(parseTranscript({ version: 1, runId: state.runId, nickname: state.nickname, mode: "progressive", steps })), state);
});
