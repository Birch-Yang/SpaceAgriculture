import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../state/reducer.ts";
import { renderUtilityNetwork } from "./adapters.ts";

test("utility visuals identify bottlenecks and isolated links", () => {
  const state = createInitialState("network-test", "Tester", "challenge");
  state.phase = "operation";
  state.modules = [
    { id: "habitat-1", moduleId: "habitat-core", x: 0, y: 0, rotation: 0, integrity: 1 },
    { id: "solar-1", moduleId: "solar-array", x: 4, y: 0, rotation: 0, integrity: 1 },
    { id: "water-1", moduleId: "water-recycler", x: 8, y: 0, rotation: 0, integrity: 1 },
    { id: "oxygen-1", moduleId: "oxygen-generator", x: 12, y: 0, rotation: 0, integrity: 1 },
  ];
  state.utilityEdges = [
    { id: "edge-1", from: "habitat-1", to: "solar-1", length: 2, capacity: 20, integrity: 1, cells: [] },
    { id: "edge-2", from: "water-1", to: "oxygen-1", length: 2, capacity: 20, integrity: 1, cells: [] },
  ];
  state.lastTurn = {
    turn: 1,
    resourceDelta: { power: 0, water: 0, oxygen: 0, food: 0, temperature: 0 },
    cropYield: 0,
    meatYield: 0,
    warnings: ["solar-1: power 40% delivered"],
  };

  const rendered = new Map(renderUtilityNetwork(state).map(({ edge, status }) => [edge.id, status]));
  assert.equal(rendered.get("edge-1"), "bottleneck");
  assert.equal(rendered.get("edge-2"), "disconnected");
});
