import assert from 'node:assert/strict';
import test from 'node:test';
import { newSupply, resolveSupply, chooseSupplyCrop } from '../src/game/simulation/supplyUnits.ts';

test('reference mission matches Python prototype and dependencies cause shortages', () => {
  let state = newSupply();
  for (let i = 1; i <= 12; i++) {
    const result = resolveSupply(state);
    assert.deepEqual(result.critical, []);
    if (i === 4) assert.equal(result.discharge, 4);
    state = result.next;
  }
  assert.equal(state.harvested.reduce((a, b) => a + b, 0), 200);
  assert.throws(() => resolveSupply(state));
  const shortage = resolveSupply(newSupply({ ...newSupply().config, solar: 1, batteries: 0 }));
  assert.deepEqual(shortage.growth, [1, 1, 0]);
  const water = resolveSupply(newSupply({ ...newSupply().config, recyclers: 0 }));
  assert.deepEqual(water.growth, [0, 0, 0]);
  assert.ok(water.critical.length);
  const original = newSupply(); resolveSupply(original);
  assert.equal(original.turn, 0); assert.equal(original.battery, 0);
});

test('crop choices preserve the active batch and switch only after its harvest', () => {
  const setup = chooseSupplyCrop(newSupply(), 0, 'potato');
  assert.equal(resolveSupply(setup).powerDemand, 18);
  const growing = resolveSupply(newSupply()).next;
  const queued = chooseSupplyCrop(growing, 0, 'potato');
  assert.equal(queued.config.crops[0], 'lettuce');
  assert.equal(queued.progress[0], 1);
  assert.equal(queued.nextCrops[0], 'potato');
  assert.equal(chooseSupplyCrop(queued, 0, 'lettuce').nextCrops[0], null);
  const result = resolveSupply(queued);
  assert.equal(result.harvest[0], 10);
  assert.equal(result.next.config.crops[0], 'potato');
  assert.equal(result.next.progress[0], 0);
  assert.equal(result.next.nextCrops[0], null);
  assert.equal(result.next.harvested[0], 10);
  assert.equal(growing.nextCrops[0], null);
});
