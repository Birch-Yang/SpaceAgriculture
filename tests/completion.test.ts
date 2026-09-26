import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifySpectrumWebhook } from "../src/ai/webhookSignature.ts";
import { resourceCapacity } from "../src/data/systems.ts";
import { resolveTurn } from "../src/game/simulation/resolveTurn.ts";
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
    const result = resolveTurn(state, [...actions, { type: "END_TURN" }], `${state.runId}:${state.level}:${state.turn}`);
    steps.push({ kind: "turn", actions: result.acceptedActions });
    state = result.state;
  }
  const transcript: RunTranscript = { version: 1, runId: state.runId, nickname: state.nickname, mode: "challenge", steps };
  assert.equal(state.phase, "complete");
  assert.deepEqual(replayTranscript(parseTranscript(transcript)), state);
  assert.throws(() => parseTranscript({ ...transcript, steps: [{ kind: "turn", actions: [{ type: "REPAIR", targetId: "fake", minigameModifier: 99 }] }] }));
  assert.throws(() => parseTranscript({ ...transcript, steps: [{ kind: "build", action: { type: "PLACE_MODULE", moduleId: "habitat-core", x: 0, y: 0, rotation: 90 } }] }));
  assert.throws(() => replayTranscript({ ...transcript, steps: [...steps, { kind: "turn", actions: [] }] }));
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
    const result = resolveTurn(state, actions, `${state.runId}:${state.level}:${state.turn}`);
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
      }
      if (state.level === 3) {
        addBuild({ type: "PLACE_MODULE", moduleId: "solar-array", x: 6, y: 5, rotation: 0 });
        addBuild({ type: "PLACE_CORRIDOR", cells: [{ x: 5, y: 5 }] });
        addBuild({ type: "PLACE_MODULE", moduleId: "solar-array", x: 1, y: 2, rotation: 0 });
        addBuild({ type: "PLACE_CORRIDOR", cells: [{ x: 2, y: 1 }] });
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
