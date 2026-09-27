import { connectedToHabitat } from "../src/data/systems.ts";
import { resolveUtilityGraph } from "../src/game/simulation/utilityGraph.ts";
import { renderUtilityNetwork } from "../src/game/phaser/adapters.ts";
import { replayTranscript, type RunTranscript } from "../src/game/state/transcript.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { applyBuildAction, createInitialState, startOperation } from "../src/game/state/reducer.ts";
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

test("crisis grants one turn, then ends the mission if still critical", () => {
  const state = startOperation(sampleBase());
  state.resources.water = 0;
  state.utilityEdges = [];
  const first = resolveTurn(state, [], "seed");
  assert.equal(first.state.crisis?.recoveryTurn, 2);
  assert.equal(first.state.phase, "operation");
  const second = resolveTurn(first.state, [], "seed");
  assert.equal(second.state.phase, "complete");
  assert.equal(second.state.passed, false);
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

function junctionBase(): GameState {
  let state = createInitialState("11111111-1111-4111-8111-111111111111", "Junction tester", "challenge");
  for (const [moduleId, x, y] of [
    ["habitat-core", 0, 4], ["solar-array", 8, 4],
    ["water-recycler", 4, 0], ["greenhouse-compact", 4, 7],
    ["oxygen-generator", 11, 4],
  ] as const) state = build({ type: "PLACE_MODULE", moduleId, x, y, rotation: 0 }, state);
  state = build({ type: "PLACE_CORRIDOR", cells: Array.from({ length: 6 }, (_, i) => ({ x: i + 2, y: 4 })) }, state);
  return build({ type: "PLACE_CORRIDOR", cells: [{ x: 10, y: 4 }] }, state);
}

const crossing = { type: "PLACE_CORRIDOR", cells: Array.from({ length: 6 }, (_, i) => ({ x: 4, y: i + 1 })) } as const;

test("crossings join real resource delivery, charge only new cells, and reject duplicate strokes", () => {
  const before = junctionBase();
  const state = build(crossing, before);
  assert.equal(before.budget - state.budget, 5);
  assert.equal(before.utilityEdges.length, 2);
  for (const module of state.modules) assert.equal(connectedToHabitat(state, module.id), true);
  const graph = resolveUtilityGraph(state);
  assert.equal(graph.delivery["module-4"].power, 1);
  assert.equal(graph.delivery["module-4"].water, 1);
  assert.equal(graph.delivery["module-1"].oxygen, 1);
  assert.ok(graph.net.oxygen > 0);
  assert.ok(renderUtilityNetwork(startOperation(state)).every(edge => edge.status === "connected"));
  const duplicate = applyBuildAction(state, crossing);
  assert.match(duplicate.error!, /already exists/);
  assert.equal(duplicate.state, state);
  const overlap = applyBuildAction(state, { type: "PLACE_CORRIDOR", cells: [{ x: 4, y: 0 }, { x: 4, y: 1 }] });
  assert.match(overlap.error!, /overlaps a module/);
});

test("T junction endpoints can overlap or abut existing corridors, in either drawing direction", () => {
  for (const overlap of [false, true]) for (const reverse of [false, true]) {
    const before = junctionBase();
    let cells = Array.from({ length: overlap ? 4 : 3 }, (_, i) => ({ x: 4, y: i + 1 }));
    if (reverse) cells = cells.reverse();
    const state = build({ type: "PLACE_CORRIDOR", cells }, before);
    assert.equal(before.budget - state.budget, 3);
    assert.equal(connectedToHabitat(state, "module-3"), true);
    assert.ok(resolveUtilityGraph(state).delivery["module-3"].power! > 0.999);
  }
});

test("junctions disconnect after removal or damage without retaining phantom links", () => {
  const crossed = build(crossing, junctionBase());
  const trunkId = crossed.utilityEdges[0].id;
  const removed = build({ type: "REMOVE_CORRIDOR", edgeId: trunkId }, crossed);
  assert.equal(connectedToHabitat(removed, "module-3"), false);
  assert.equal(resolveUtilityGraph(removed).delivery["module-4"].power, 0);
  const broken = structuredClone(crossed);
  broken.utilityEdges[0].integrity = 0.15;
  assert.equal(connectedToHabitat(broken, "module-3"), false);
  assert.equal(resolveUtilityGraph(broken).delivery["module-4"].power, 0);
  const restored = structuredClone(broken);
  restored.utilityEdges[0].integrity = 1;
  assert.equal(connectedToHabitat(restored, "module-3"), true);
  const branchRemoved = build({ type: "REMOVE_CORRIDOR", edgeId: crossed.utilityEdges.at(-1)!.id }, crossed);
  assert.equal(connectedToHabitat(branchRemoved, "module-2"), true);
  assert.equal(connectedToHabitat(branchRemoved, "module-3"), false);
  const moduleRemoved = build({ type: "REMOVE_MODULE", placedModuleId: "module-3" }, crossed);
  assert.equal(connectedToHabitat(moduleRemoved, "module-4"), false);
});

test("overlapping corridors share bottleneck capacity instead of adding parallel supply", () => {
  const state = build(crossing, junctionBase());
  state.resources.power = 0;
  state.utilityEdges[0].capacity = 4;
  const graph = resolveUtilityGraph(state);
  assert.ok(graph.delivery["module-3"].power! < 1);
  assert.ok(graph.delivery["module-4"].power! < 1);
  assert.ok(graph.bottlenecks.length > 0);
});

test("diagonal corridor proximity and unanchored endpoints do not connect", () => {
  const isolated = createInitialState("isolation", "Tester", "challenge");
  isolated.utilityEdges = [{ id: "edge-1", from: "missing-a", to: "missing-b", cells: [{ x: 5, y: 5 }], length: 1, capacity: 20, integrity: 1 }];
  const diagonal = applyBuildAction(isolated, { type: "PLACE_CORRIDOR", cells: [{ x: 4, y: 4 }] });
  assert.ok(diagonal.error);
  assert.equal(diagonal.state, isolated);
});

test("junction builds and resource turns replay deterministically from their action transcript", () => {
  let state = createInitialState("11111111-1111-4111-8111-111111111111", "Replay junction", "challenge");
  const steps: RunTranscript["steps"] = [];
  const layout = junctionBase();
  const actions: PlayerAction[] = [
    ...layout.modules.map(module => ({ type: "PLACE_MODULE" as const, moduleId: module.moduleId, x: module.x, y: module.y, rotation: module.rotation })),
    ...layout.utilityEdges.map(edge => ({ type: "PLACE_CORRIDOR" as const, cells: edge.cells })), crossing,
  ];
  for (const action of actions) { state = build(action, state); steps.push({ kind: "build", action }); }
  state = startOperation(state); steps.push({ kind: "start" });
  while (state.phase === "operation") {
    const result = resolveTurn(state, [], `${state.runId}:${state.level}`);
    state = result.state; steps.push({ kind: "turn", actions: result.acceptedActions });
  }
  assert.deepEqual(replayTranscript({ version: 1, runId: state.runId, nickname: state.nickname, mode: state.mode, steps }), state);
});
