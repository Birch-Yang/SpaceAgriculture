import { createReplayFrames } from "../src/game/state/replayFrames.ts";
import { seedForLevel } from "../src/game/simulation/hazards.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { advanceLevel, applyBuildAction, createInitialState, startOperation } from "../src/game/state/reducer.ts";
import { resolveTurn } from "../src/game/simulation/resolveTurn.ts";
import type { GameState, PlayerAction } from "../src/game/state/types.ts";

function build(action: PlayerAction, state: GameState): GameState {
  const result = applyBuildAction(state, action);
  assert.equal(result.error, undefined);
  return result.state;
}

function sampleBase(): GameState {
  let state = createInitialState("11111111-1111-4111-8111-111111111111", "Tester", "challenge");
  for (const [moduleId, x, y] of [
    ["habitat-core", 0, 0], ["solar-array", 3, 0], ["oxygen-generator", 3, 3],
    ["water-recycler", 0, 4], ["greenhouse-standard", 6, 0], ["livestock-compact", 6, 3],
  ] as const) state = build({ type: "PLACE_MODULE", moduleId, x, y, rotation: 0 }, state);
  for (const cells of [
    [{ x: 2, y: 0 }], [{ x: 3, y: 2 }], [{ x: 0, y: 2 }, { x: 0, y: 3 }],
    [{ x: 5, y: 0 }], [{ x: 6, y: 2 }],
  ]) state = build({ type: "PLACE_CORRIDOR", cells }, state);
  return state;
}

test("same state, actions, and seed resolve identically and leave input unchanged", () => {
  const state = startOperation(sampleBase());
  const before = structuredClone(state);
  const first = resolveTurn(state, [{ type: "END_TURN" }], "seed-7");
  const second = resolveTurn(state, [{ type: "END_TURN" }], "seed-7");
  assert.deepEqual(first, second);
  assert.deepEqual(state, before);
  assert.ok(first.summary.resourceDelta.power !== 0);
  assert.equal(first.state.crops.find((plot) => plot.slotIndex === 1)?.growth, 0);
});

test("critical resources fail on the same turn without an extra recovery turn", () => {
  const state = startOperation(sampleBase());
  state.resources.water = 0;
  state.utilityEdges = [];
  const first = resolveTurn(state, [{ type: "END_TURN" }], seedForLevel(state));
  assert.equal(first.state.phase, "complete");
  assert.equal(first.state.turn, 1);
  assert.equal(first.state.passed, false);
  assert.match(first.state.failureReason ?? "", /Critical system at end of turn/);
  assert.equal(first.state.crisis, undefined);
});

test("agriculture modules create their exact independent capacity and remove every slot", () => {
  let state = createInitialState("11111111-1111-4111-8111-111111111111", "Tester", "challenge");
  for (const [moduleId, capacity, collection] of [
    ["greenhouse-compact", 1, "crops"], ["greenhouse-standard", 2, "crops"], ["greenhouse-industrial", 3, "crops"],
    ["livestock-compact", 1, "livestock"], ["livestock-standard", 2, "livestock"], ["livestock-industrial", 3, "livestock"],
  ] as const) {
    const placed = build({ type: "PLACE_MODULE", moduleId, x: 0, y: 0, rotation: 0 }, state);
    const moduleIdPlaced = placed.modules.at(-1)!.id;
    const slots = placed[collection].filter((slot) => slot.moduleId === moduleIdPlaced);
    assert.deepEqual(slots.map((slot) => slot.slotIndex), Array.from({ length: capacity }, (_, index) => index));
    assert.equal("crop" in slots[0] ? slots[0].crop : slots[0].animal, collection === "crops" ? "lettuce" : "chicken");
    assert.ok(slots.slice(1).every((slot) => ("crop" in slot ? slot.crop : slot.animal) === null));
    state = build({ type: "REMOVE_MODULE", placedModuleId: moduleIdPlaced }, placed);
    assert.equal(state[collection].length, 0);
  }
});

test("slot actions isolate occupants, care is once per cycle, and rejected actions spend nothing", () => {
  const state = startOperation(sampleBase());
  const greenhouse = state.modules.find((module) => module.moduleId === "greenhouse-standard")!.id;
  const stall = state.modules.find((module) => module.moduleId === "livestock-compact")!.id;
  const result = resolveTurn(state, [
    { type: "WATER_PLOT", moduleId: greenhouse, slotIndex: 1 },
    { type: "PLANT_CROP", moduleId: greenhouse, slotIndex: 1, crop: "potato" },
    { type: "WATER_PLOT", moduleId: greenhouse, slotIndex: 1 },
    { type: "WATER_PLOT", moduleId: greenhouse, slotIndex: 1 },
    { type: "FEED_STALL", moduleId: stall, slotIndex: 0, minigameModifier: 0.9 },
  ], "slot-seed");
  assert.equal(result.rejectedActions.length, 2);
  assert.ok(result.rejectedActions.every((message) => message.includes("slot 1")));
  assert.equal(result.state.ap, 0);
  assert.equal(result.state.crops.find((plot) => plot.moduleId === greenhouse && plot.slotIndex === 0)?.crop, "lettuce");
  assert.equal(result.state.crops.find((plot) => plot.moduleId === greenhouse && plot.slotIndex === 1)?.crop, "potato");
  assert.equal(result.state.crops.find((plot) => plot.moduleId === greenhouse && plot.slotIndex === 1)?.wateredThisCycle, true);
  assert.equal(result.state.livestock[0].feedMinigameModifier, 0.1);

  const depleted = startOperation(sampleBase());
  depleted.resources.water = 0;
  depleted.resources.food = 0;
  const baseline = resolveTurn(depleted, [], "slot-seed");
  const rejected = resolveTurn(depleted, [
    { type: "WATER_PLOT", moduleId: greenhouse, slotIndex: 0 },
    { type: "FEED_STALL", moduleId: stall, slotIndex: 0 },
    { type: "PLANT_CROP", moduleId: greenhouse, slotIndex: 9, crop: "potato" },
    { type: "FEED_STALL", moduleId: stall, slotIndex: 0, minigameModifier: Number.NaN },
  ], "slot-seed");
  assert.equal(rejected.rejectedActions.length, 4);
  assert.deepEqual(rejected.state, baseline.state);

  let industrial = createInitialState("11111111-1111-4111-8111-111111111111", "Tester", "challenge");
  industrial = build({ type: "PLACE_MODULE", moduleId: "habitat-core", x: 0, y: 0, rotation: 0 }, industrial);
  industrial = build({ type: "PLACE_MODULE", moduleId: "greenhouse-industrial", x: 4, y: 0, rotation: 0 }, industrial);
  industrial = build({ type: "PLACE_MODULE", moduleId: "livestock-industrial", x: 9, y: 0, rotation: 0 }, industrial);
  const greenhouse3 = industrial.modules.find((module) => module.moduleId === "greenhouse-industrial")!.id;
  const stall3 = industrial.modules.find((module) => module.moduleId === "livestock-industrial")!.id;
  const thirdSlot = resolveTurn(startOperation(industrial), [
    { type: "PLANT_CROP", moduleId: greenhouse3, slotIndex: 2, crop: "soybean" },
    { type: "WATER_PLOT", moduleId: greenhouse3, slotIndex: 2 },
    { type: "SET_ANIMAL", moduleId: stall3, slotIndex: 2, animal: "cow" },
  ], "slot-seed");
  assert.equal(thirdSlot.rejectedActions.length, 0);
  assert.equal(thirdSlot.state.crops.find((plot) => plot.moduleId === greenhouse3 && plot.slotIndex === 1)?.crop, null);
  assert.equal(thirdSlot.state.crops.find((plot) => plot.moduleId === greenhouse3 && plot.slotIndex === 2)?.crop, "soybean");
  assert.equal(thirdSlot.state.crops.find((plot) => plot.moduleId === greenhouse3 && plot.slotIndex === 2)?.wateredThisCycle, true);
  assert.equal(thirdSlot.state.livestock.find((animal) => animal.moduleId === stall3 && animal.slotIndex === 2)?.animal, "cow");
});

test("harvest and repair modifiers are bounded and duplicate harvest is rejected", () => {
  const state = startOperation(sampleBase());
  const greenhouse = state.modules.find((module) => module.moduleId === "greenhouse-standard")!.id;
  state.crops[0].ready = true;
  state.crops[0].wateredThisCycle = true;
  const solar = state.modules.find((module) => module.moduleId === "solar-array")!;
  solar.integrity = 0.5;
  const harvest = { type: "HARVEST_CROP", moduleId: greenhouse, slotIndex: 0, minigameModifier: 1 } as const;
  const result = resolveTurn(state, [harvest, harvest, { type: "REPAIR", targetId: solar.id, minigameModifier: 1 }], "slot-seed");
  const bounded = resolveTurn(state, [{ ...harvest, minigameModifier: 0.1 }, { type: "REPAIR", targetId: solar.id, minigameModifier: 0.1 }], "slot-seed");
  assert.equal(result.summary.cropYield, bounded.summary.cropYield);
  assert.equal(result.rejectedActions.length, 1);
  assert.ok(result.rejectedActions[0].includes("slot 0"));
  assert.equal(result.state.modules.find((module) => module.id === solar.id)?.integrity, 0.775);
  assert.equal(result.state.crops[0].wateredThisCycle, false);
  assert.ok(result.state.history.some((event) => event.type === "CROP_YIELD" && event.message.includes(`${greenhouse} slot 0`)));
});

test("a connected sample base can finish ten challenge turns with active farming", () => {
  let state = startOperation(sampleBase());
  const greenhouse = state.modules.find((module) => module.moduleId === "greenhouse-standard")!;
  for (let i = 0; i < 10 && state.phase === "operation"; i++) {
    const actions: PlayerAction[] = state.crops.filter((crop) => crop.moduleId === greenhouse.id && crop.ready)
      .map((crop) => ({ type: "HARVEST_CROP", moduleId: greenhouse.id, slotIndex: crop.slotIndex }));
    if (i === 0) actions.push({ type: "PLANT_CROP", moduleId: greenhouse.id, slotIndex: 1, crop: "lettuce" });
    if (i === 0) actions.push({ type: "SET_CROP_PARAMS", moduleId: greenhouse.id, water: "high", light: "high", temperature: "medium" });
    const result = resolveTurn(state, actions, "demo-seed");
    state = result.state;
  }
  assert.equal(state.phase, "complete");
  assert.ok(state.production.cropCumulative > 0);
  assert.ok(state.production.meatCumulative > 0);
  assert.equal(state.lastTurn?.turn, 10);
  assert.equal(state.passed, true, `Production: ${JSON.stringify(state.production)}; failure: ${state.failureReason}`);
});


test("pre-mission removal restores full module cost without duplicate refunds", () => {
  for (const moduleId of ["habitat-core", "greenhouse-standard", "communication-tower"]) {
    const initial = createInitialState("refund-test", "Tester", "challenge");
    const placed = build({ type: "PLACE_MODULE", moduleId, x: 3, y: 3, rotation: 0 }, initial);
    const placedModuleId = placed.modules[0].id;
    assert.ok(placed.budget < initial.budget);
    const removed = build({ type: "REMOVE_MODULE", placedModuleId }, placed);
    assert.equal(removed.budget, initial.budget);
    assert.equal(removed.modules.length, 0);
    assert.equal(removed.crops.length, 0);
    const repeated = applyBuildAction(removed, { type: "REMOVE_MODULE", placedModuleId });
    assert.ok(repeated.error);
    assert.equal(repeated.state.budget, initial.budget);
    if (moduleId === "habitat-core") {
      const active = startOperation(placed);
      const locked = applyBuildAction(active, { type: "REMOVE_MODULE", placedModuleId });
      assert.ok(locked.error);
      assert.equal(locked.state.budget, active.budget);
    }
  }
});

// Regression coverage for the ten-mission QA findings.
import { getBuildRemovalRefund } from "../src/game/state/reducer.ts";
import { apRecovery } from "../src/game/simulation/resolveTurn.ts";
import { scoreRules } from "../src/game/simulation/scoring.ts";
import { selectBuildReadinessWarnings, selectTurnLabel } from "../src/game/state/selectors.ts";

test("AP planning matches actual recovery across food reserve tiers", () => {
  for (const food of [0, 12, 26, 43, 60]) {
    const state = startOperation(sampleBase());
    state.resources.food = food;
    const expected = apRecovery(state);
    const greenhouse = state.crops[0].moduleId;
    const actions: PlayerAction[] = Array.from({ length: expected }, () => ({ type: "SET_CROP_PARAMS", moduleId: greenhouse, slotIndex: 0, water: "medium", light: "medium", temperature: "medium" }));
    const result = resolveTurn(state, actions, "ap-regression");
    assert.equal(result.rejectedActions.length, 0);
    assert.equal(result.state.ap, 0);
  }
  assert.equal(apRecovery(startOperation(sampleBase())), 3);
});

test("preflight flags impossible production and disconnected systems without blocking launch", () => {
  const connected = sampleBase();
  assert.deepEqual(selectBuildReadinessWarnings(connected), []);
  const disconnected = { ...connected, utilityEdges: [] };
  assert.ok(selectBuildReadinessWarnings(disconnected).some(text => text.includes("disconnected")));
  let bare = createInitialState("bare", "QA", "challenge");
  bare = build({ type: "PLACE_MODULE", moduleId: "habitat-core", x: 0, y: 0, rotation: 0 }, bare);
  const warnings = selectBuildReadinessWarnings(bare);
  assert.ok(warnings.some(text => text.includes("No greenhouse")));
  assert.ok(warnings.some(text => text.includes("No livestock")));
  assert.equal(startOperation(bare).phase, "operation");
});

test("initial removal refunds attached corridors exactly once and direct corridor removal is reversible", () => {
  const original = sampleBase();
  const greenhouse = original.modules.find(item => item.moduleId === "greenhouse-standard")!;
  assert.equal(getBuildRemovalRefund(original, greenhouse.id), 30);
  const removed = build({ type: "REMOVE_MODULE", placedModuleId: greenhouse.id }, original);
  assert.equal(removed.budget, original.budget + 30);
  assert.equal(removed.utilityEdges.length, original.utilityEdges.length - 2);
  assert.ok(applyBuildAction(removed, { type: "REMOVE_MODULE", placedModuleId: greenhouse.id }).error);
  const edge = original.utilityEdges[0];
  const withoutEdge = build({ type: "REMOVE_CORRIDOR", edgeId: edge.id }, original);
  assert.equal(withoutEdge.budget, original.budget + edge.cells.length);
  assert.ok(applyBuildAction(withoutEdge, { type: "REMOVE_CORRIDOR", edgeId: edge.id }).error);
  const afterBoth = build({ type: "REMOVE_MODULE", placedModuleId: greenhouse.id }, withoutEdge);
  assert.equal(afterBoth.budget, original.budget + 30 + edge.cells.length);
});

test("overproduction cannot offset a missing production category in scoring", () => {
  const state = sampleBase();
  state.production = { cropCumulative: 0, meatCumulative: 1000 };
  assert.equal(scoreRules(state).production, 14);
  state.production = { cropCumulative: 1000, meatCumulative: 0 };
  assert.equal(scoreRules(state).production, 14);
  state.production = { cropCumulative: 16, meatCumulative: 10 };
  assert.equal(scoreRules(state).production, 28);
});

test("emergency turn labels distinguish recovery from the ten-turn mission", () => {
  const state = sampleBase();
  assert.equal(selectTurnLabel({ ...state, turn: 10 }), "TURN 10/10");
  assert.equal(selectTurnLabel({ ...state, turn: 10 }), "TURN 10/10");
});

import { planOperationActions } from "../src/game/simulation/resolveTurn.ts";
import { suppliesRemaining, emergencySupplyAmount } from "../src/game/simulation/emergency.ts";
import { resolveUtilityGraph } from "../src/game/simulation/utilityGraph.ts";
import { parseTranscript, replayTranscript, type RunTranscript } from "../src/game/state/transcript.ts";

test("emergency pause preserves occupants, stops output, reduces demand, and resumes automatically", () => {
  const state = startOperation(sampleBase());
  const greenhouse = state.modules.find(m => m.moduleId === "greenhouse-standard")!;
  const livestock = state.modules.find(m => m.moduleId === "livestock-compact")!;
  state.livestock[0].growth = 100; // Otherwise output would occur this turn.
  const actions: PlayerAction[] = [{ type: "PAUSE_MODULE", moduleId: greenhouse.id }, { type: "PAUSE_MODULE", moduleId: livestock.id }];
  const plan = planOperationActions(state, actions);
  assert.deepEqual(plan.rejectedActions, []);
  assert.equal(plan.apUsed, 2);
  assert.ok(resolveUtilityGraph(plan.state).net.power > resolveUtilityGraph(state).net.power);
  assert.ok(resolveUtilityGraph(plan.state).net.water > resolveUtilityGraph(state).net.water);
  const paused = resolveTurn(state, [...actions, { type: "END_TURN" }], "pause-test");
  assert.deepEqual(paused.state.crops, state.crops);
  assert.deepEqual(paused.state.livestock, state.livestock);
  assert.equal(paused.summary.meatYield, 0);
  assert.equal(paused.summary.cropYield, 0);
  assert.deepEqual(paused.state.pausedModuleIds, []);
  const resumed = resolveTurn(paused.state, [{ type: "END_TURN" }], "pause-test");
  assert.ok(resumed.summary.meatYield > 0);
  assert.ok(resumed.state.crops[0].growth > state.crops[0].growth);
});

test("pause conflicts reject in both orders, invalid targets and duplicates spend no extra AP", () => {
  const state = startOperation(sampleBase());
  const id = state.crops[0].moduleId;
  const pause: PlayerAction = { type: "PAUSE_MODULE", moduleId: id };
  const water: PlayerAction = { type: "WATER_PLOT", moduleId: id, slotIndex: 0 };
  for (const actions of [[pause, water], [water, pause], [pause, pause]]) {
    const plan = planOperationActions(state, actions);
    assert.equal(plan.acceptedActions.length, 1);
    assert.equal(plan.rejectedActions.length, 1);
    assert.equal(plan.apUsed, 1);
  }
  const invalid = planOperationActions(state, [{ type: "PAUSE_MODULE", moduleId: state.modules[0].id }]);
  assert.equal(invalid.apUsed, 0);
  assert.equal(invalid.rejectedActions.length, 1);
});

test("supplies are bounded, one per turn, two per run, and plans never spend live inventory", () => {
  const state = startOperation(sampleBase());
  const before = structuredClone(state);
  const supply: PlayerAction = { type: "USE_EMERGENCY_SUPPLY", resource: "power" };
  const plan = planOperationActions(state, [supply, supply]);
  assert.deepEqual(state, before);
  assert.equal(plan.state.resources.power - state.resources.power, emergencySupplyAmount("power"));
  assert.equal(suppliesRemaining(plan.state), 1);
  assert.equal(plan.rejectedActions.length, 1);
  assert.equal(plan.apUsed, 1);
  assert.equal(suppliesRemaining(planOperationActions(state, []).state), 2); // Cancelled queue.
  const next = resolveTurn(state, [supply, { type: "END_TURN" }], "supply-test").state;
  const last = resolveTurn(next, [{ type: "USE_EMERGENCY_SUPPLY", resource: "water" }, { type: "END_TURN" }], "supply-test").state;
  assert.equal(suppliesRemaining(last), 0);
  assert.match(planOperationActions(last, [supply]).rejectedActions[0], /No emergency supplies/);
  state.resources.power = 39;
  assert.equal(planOperationActions(state, [supply]).state.resources.power, 40);
  state.resources.power = 40;
  const full = planOperationActions(state, [supply]);
  assert.equal(full.apUsed, 0);
  assert.equal(suppliesRemaining(full.state), 2);
  assert.match(full.rejectedActions[0], /already full/);
});

test("first accepted emergency action on a hazard turn is free; later actions use normal AP", () => {
  const state = startOperation(sampleBase());
  state.resources.food = 0;
  state.activeHazard = { id: "test-power", type: "power", severity: 1, turn: state.turn };
  const actions: PlayerAction[] = [
    { type: "PAUSE_MODULE", moduleId: "missing" },
    { type: "USE_EMERGENCY_SUPPLY", resource: "food" },
    { type: "PAUSE_MODULE", moduleId: state.crops[0].moduleId },
  ];
  const plan = planOperationActions(state, actions);
  assert.equal(plan.apUsed, 1);
  assert.equal(plan.acceptedActions.length, 2);
  assert.equal(plan.rejectedActions.length, 1);
  assert.equal(plan.state.ap, apRecovery(state) - 1); // Refill does not grant extra AP mid-turn.
  const resolved = resolveTurn(state, actions.slice(1), "crisis-test");
  assert.equal(resolved.state.crisis, undefined);
  assert.equal(resolved.acceptedActions[0].type, "USE_EMERGENCY_SUPPLY");
});

test("supplies do not add a recovery turn or reset when advancing levels", () => {
  const state = startOperation(sampleBase());
  state.resources.oxygen = 0;
  state.modules.find(m => m.moduleId === "oxygen-generator")!.integrity = 0;
  const failed = resolveTurn(state, [{ type: "USE_EMERGENCY_SUPPLY", resource: "water" }], "deadline-test");
  assert.equal(failed.state.phase, "complete");
  assert.equal(failed.state.passed, false);
  const progressive = createInitialState("progressive-emergency", "QA", "progressive");
  progressive.phase = "intermission";
  progressive.passed = true;
  progressive.emergencySuppliesRemaining = 1;
  assert.equal(suppliesRemaining(advanceLevel(progressive)), 1);
});

test("server transcript replay validates emergency actions and reproduces client results", () => {
  const transcript: RunTranscript = { version: 1, runId: "00000000-0000-4000-8000-000000000201", nickname: "Emergency QA", mode: "challenge", steps: [] };
  let state = createInitialState(transcript.runId, transcript.nickname, transcript.mode);
  const action: PlayerAction = { type: "PLACE_MODULE", moduleId: "habitat-core", x: 0, y: 0, rotation: 0 };
  state = build(action, state);
  transcript.steps.push({ kind: "build", action }, { kind: "start" });
  state = startOperation(state);
  while (state.phase === "operation") {
    const actions: PlayerAction[] = state.turn === 1 ? [{ type: "USE_EMERGENCY_SUPPLY", resource: "power" }, { type: "END_TURN" }] : [{ type: "END_TURN" }];
    const result = resolveTurn(state, actions, seedForLevel(state));
    assert.deepEqual(result.rejectedActions, []);
    transcript.steps.push({ kind: "turn", actions });
    state = result.state;
  }
  assert.deepEqual(replayTranscript(transcript), state);
  for (const frame of createReplayFrames(transcript).filter(frame => frame.kind === "turn" && frame.hazard))
    assert.equal(frame.hazard!.turn, frame.turn);
  const invalid = structuredClone(transcript);
  (invalid.steps[2] as { actions: unknown[] }).actions[0] = { type: "USE_EMERGENCY_SUPPLY", resource: "temperature" };
  assert.throws(() => parseTranscript(invalid), /Invalid run step/);
  const duplicate = structuredClone(transcript);
  const turn = duplicate.steps[2] as { actions: PlayerAction[] };
  turn.actions.unshift({ type: "USE_EMERGENCY_SUPPLY", resource: "water" });
  assert.throws(() => replayTranscript(duplicate), /Only one emergency supply/);
});

import { hazardForTurn } from "../src/game/simulation/hazards.ts";
import { hazardMitigationCondition, previewHazardResponse } from "../src/game/simulation/resolveTurn.ts";
import { EMERGENCY } from "../src/data/emergency.ts";

test("current hazard is shown before actions and next hazard is not shown on the prior turn", () => {
  const state = startOperation(sampleBase());
  assert.equal(state.activeHazard, undefined);
  assert.equal(state.activeHazard, hazardForTurn(state, seedForLevel(state)));
  const result = resolveTurn(state, [{ type: "END_TURN" }], seedForLevel(state));
  assert.equal(result.state.turn, 2);
  assert.deepEqual(result.state.activeHazard, hazardForTurn(result.state, seedForLevel(result.state)));
  assert.equal(result.summary.hazard, undefined);
  assert.notEqual(result.state.activeHazard?.turn, 1);
});

test("current-turn power supply can cross the mitigation threshold and reduce hazard severity", () => {
  const state = startOperation(sampleBase());
  state.turn = 2;
  for (let i = 1; i < 500; i++) {
    state.runId = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    state.activeHazard = hazardForTurn(state, seedForLevel(state));
    if (state.activeHazard?.type === "power") break;
  }
  assert.equal(state.activeHazard?.type, "power");
  state.resources.power = EMERGENCY.powerReserveMitigationThreshold - 8;
  const rawSeverity = state.activeHazard!.severity;
  assert.equal(previewHazardResponse(state, []).ready, false);
  const supply: PlayerAction = { type: "USE_EMERGENCY_SUPPLY", resource: "power" };
  assert.equal(previewHazardResponse(state, [supply]).ready, true);
  const result = resolveTurn(state, [supply, { type: "END_TURN" }], seedForLevel(state));
  assert.equal(result.summary.hazard?.severity, Math.round(rawSeverity * EMERGENCY.mitigatedSeverityFraction * 100) / 100);
  assert.ok(result.summary.warnings.some(w => w.includes("reduced power severity by 70%")));
  assert.equal(result.state.turn, 3);
});

test("shelter and thermal mitigation conditions respond to same-turn repair and allocation", () => {
  const state = startOperation(sampleBase());
  const shelter = { id: "shelter-test", moduleId: "shelter", x: 10, y: 10, rotation: 0 as const, integrity: 0.7 };
  const utility = { id: "utility-test", moduleId: "utility-thermal", x: 12, y: 10, rotation: 0 as const, integrity: 1, allocation: { thermal: 0.3, backupPower: 0.5, commsBackup: 0.2 } };
  state.modules.push(shelter, utility);
  state.utilityEdges.push({ id: "shelter-edge", from: state.modules[0].id, to: shelter.id, length: 1, capacity: 20, integrity: 1, cells: [] });
  state.utilityEdges.push({ id: "utility-edge", from: state.modules[0].id, to: utility.id, length: 1, capacity: 20, integrity: 1, cells: [] });
  state.activeHazard = { id: "impact", type: "micrometeoroid", severity: 1, turn: state.turn };
  assert.equal(previewHazardResponse(state, []).ready, false);
  assert.equal(previewHazardResponse(state, [{ type: "REPAIR", targetId: shelter.id }]).ready, true);
  state.activeHazard = { id: "cold", type: "temperature", severity: 1, turn: state.turn };
  assert.equal(previewHazardResponse(state, []).ready, false);
  assert.equal(previewHazardResponse(state, [{ type: "REALLOCATE_UTILITY", moduleId: utility.id, allocation: { thermal: 0.5, backupPower: 0.3, commsBackup: 0.2 } }]).ready, true);
  assert.equal(hazardMitigationCondition(state), false);
});

test("ten-turn Challenge cannot produce an eleventh turn after a late hazard", () => {
  const state = startOperation(sampleBase());
  state.turn = 10;
  state.resources.power = 0;
  state.utilityEdges = [];
  const result = resolveTurn(state, [{ type: "END_TURN" }], seedForLevel(state));
  assert.equal(result.state.phase, "complete");
  assert.equal(result.state.turn, 10);
});
