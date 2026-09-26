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

test("a connected sample base can finish ten challenge turns with active farming", () => {
  let state = startOperation(sampleBase());
  const greenhouse = state.modules.find((module) => module.moduleId === "greenhouse-standard")!;
  for (let i = 0; i < 10 && state.phase === "operation"; i++) {
    const actions: PlayerAction[] = state.crops.find((crop) => crop.moduleId === greenhouse.id)?.ready
      ? [{ type: "HARVEST_CROP", moduleId: greenhouse.id }] : [];
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
