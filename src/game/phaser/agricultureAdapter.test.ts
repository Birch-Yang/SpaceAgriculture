import assert from "node:assert/strict";
import test from "node:test";
import { applyBuildAction, createInitialState } from "../state/reducer.ts";
import type { GameState } from "../state/types.ts";
import { actionCost, agricultureSlots, careAction, slotAction } from "./agricultureAdapter.ts";

function greenhouseState(): GameState {
  const initial = createInitialState("adapter-test", "Tester", "challenge");
  return applyBuildAction(initial, { type: "PLACE_MODULE", moduleId: "greenhouse-standard", x: 1, y: 1, rotation: 0 }).state;
}

test("new greenhouse exposes every authoritative crop plot", () => {
  const state = greenhouseState();
  const view = agricultureSlots(state, state.modules[0].id);
  assert.equal(view?.kind, "greenhouse");
  if (view?.kind !== "greenhouse") return;
  assert.equal(view.fullContract, true);
  assert.equal(view.slots.length, 2);
  assert.deepEqual(view.slots.map((slot) => [slot.crop, slot.supported]), [["lettuce", true], [null, true]]);
});

test("slot contract projects empty plots without inventing production", () => {
  const state = greenhouseState();
  const moduleId = state.modules[0].id;
  state.crops = [
    { moduleId, slotIndex: 0, crop: "lettuce", growth: 0.4, ready: false, water: "medium", light: "medium", temperature: "medium", wateredThisCycle: true },
    { moduleId, slotIndex: 1, crop: null, growth: 0, ready: false, water: "medium", light: "medium", temperature: "medium", wateredThisCycle: false },
  ] as unknown as GameState["crops"];
  const view = agricultureSlots(state, moduleId);
  assert.equal(view?.kind, "greenhouse");
  if (view?.kind !== "greenhouse") return;
  assert.equal(view.fullContract, true);
  assert.deepEqual(view.slots.map((slot) => [slot.crop, slot.supported, slot.wateredThisCycle]), [["lettuce", true, true], [null, true, false]]);
});

test("slot actions carry bounded minigame modifiers for the resolver", () => {
  const harvest = slotAction({ type: "HARVEST_CROP", moduleId: "module-1" }, 1, true, 0.8);
  assert.equal("slotIndex" in harvest && harvest.slotIndex, 1);
  assert.equal("minigameModifier" in harvest && harvest.minigameModifier, 0.1);
  assert.deepEqual(slotAction({ type: "HARVEST_CROP", moduleId: "module-1" }, 0, false), { type: "HARVEST_CROP", moduleId: "module-1" });
  assert.equal(careAction("FEED_STALL", "module-1", 1).type, "FEED_STALL");
  assert.equal(actionCost({ type: "REPAIR", targetId: "module-1" }), 2);
});
