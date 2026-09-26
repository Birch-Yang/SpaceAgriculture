import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createInitialState } from "../game/state/reducer.ts";
import { generatePhotonAdvice } from "./photonAdvisor.ts";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
});

test("Photon receives only coarse telemetry and returns concise advice", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = (async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ advice: "Consider which systems compete for your current reserves." }) }] }] }), { status: 200 });
  }) as typeof fetch;
  const state = createInitialState("123e4567-e89b-12d3-a456-426614174000", "Test", "challenge");
  const result = await generatePhotonAdvice(state, "What should I watch?");
  const input = JSON.parse(String(requestBody?.input)) as Record<string, unknown>;
  assert.equal(result, "Consider which systems compete for your current reserves.");
  assert.deepEqual(input.publicTelemetry, {
    water: "healthy", power: "stable", oxygen: "healthy", temperature: "nominal", agriculture: "behind",
  });
  assert.equal(JSON.stringify(input).includes("resources"), false);
  assert.equal(JSON.stringify(input).includes("modules"), false);
});

test("Photon rejects an overlong model answer", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = (async () => new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ advice: "x".repeat(421) }) }] }] }), { status: 200 })) as typeof fetch;
  const state = createInitialState("123e4567-e89b-12d3-a456-426614174000", "Test", "challenge");
  assert.equal(await generatePhotonAdvice(state, "Help"), undefined);
});
