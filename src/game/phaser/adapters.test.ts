import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../state/reducer.ts";
import { renderUtilityNetwork } from "./adapters.ts";

test("partial-delivery warnings mark adjacent corridor edges as bottlenecks", () => {
  const state = createInitialState("network-test", "Tester", "challenge");
  state.phase = "operation";
  state.modules = [
    { id: "habitat-1", moduleId: "habitat-core", x: 0, y: 0, rotation: 0, integrity: 1 },
    { id: "solar-1", moduleId: "solar-array", x: 4, y: 0, rotation: 0, integrity: 1 },
  ];
  state.utilityEdges = [{ id: "edge-1", from: "habitat-1", to: "solar-1", length: 2, capacity: 20, integrity: 1, cells: [] }];
  state.lastTurn = {
    turn: 1,
    resourceDelta: { power: 0, water: 0, oxygen: 0, food: 0, temperature: 0 },
    cropYield: 0,
    meatYield: 0,
    warnings: ["solar-1: power 40% delivered"],
  };

  assert.equal(renderUtilityNetwork(state)[0]?.status, "bottleneck");
});
