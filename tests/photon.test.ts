import assert from "node:assert/strict";
import test from "node:test";
import { normalizeIMessagePhone, openingMessage, parseInboundQuestion, questionLimitMessage, QUESTIONS_PER_TURN } from "../src/ai/missionProtocol.ts";
import { deriveAgentEvent } from "../src/ai/publicState.ts";
import { createInitialState } from "../src/game/state/reducer.ts";

test("Photon recognizes real SDK iMessage webhooks and ignores other traffic", () => {
  assert.equal(normalizeIMessagePhone("(314) 555-0123"), "+13145550123");
  assert.equal(normalizeIMessagePhone("+44 20 7946 0958"), "+442079460958");
  assert.equal(normalizeIMessagePhone("314-555-0123 ext 4"), undefined);
  const delivery = { event: "messages", space: { id: "any;-;+15550100", platform: "imessage", type: "dm" },
    message: { id: "spc-msg-1", platform: "imessage", direction: "inbound", content: { type: "text", text: "  Is the base stable?  " } } };
  assert.deepEqual(parseInboundQuestion(delivery), { spaceId: "any;-;+15550100", messageId: "spc-msg-1", text: "Is the base stable?" });
  assert.ok(parseInboundQuestion({ ...delivery, space: { ...delivery.space, platform: "iMessage" }, message: { ...delivery.message, platform: "iMessage" } }));
  assert.equal(parseInboundQuestion({ ...delivery, space: { ...delivery.space, type: "group" } }), undefined);
  assert.equal(parseInboundQuestion({ ...delivery, message: { ...delivery.message, platform: "sms" } }), undefined);
  assert.equal(parseInboundQuestion({ ...delivery, message: { ...delivery.message, content: { type: "text", text: "x".repeat(501) } } }), undefined);
});

test("Photon introduction states the two-question relay rule and hazard alerts remain vague", () => {
  assert.equal(QUESTIONS_PER_TURN, 2);
  assert.match(openingMessage, /2 questions per mission turn/i);
  assert.match(questionLimitMessage, /Pho\.\.\.ton.*break\.\.\.ing up.*next mission turn/i);
  const state = createInitialState("00000000-0000-4000-8000-000000000001", "Tester", "challenge");
  state.lastTurn = { turn: 1, hazard: { id: "hazard-1", type: "power", severity: 1, turn: 1 },
    resourceDelta: { power: 0, water: 0, oxygen: 0, food: 0, temperature: 0 }, cropYield: 0, meatYield: 0, warnings: [] };
  const event = deriveAgentEvent(state);
  assert.equal(event?.type, "HAZARD_SIGNAL");
  assert.match(event?.context[0] ?? "", /flickered/);
  assert.equal(event?.publicState.latestMajorEvent, undefined);
});
