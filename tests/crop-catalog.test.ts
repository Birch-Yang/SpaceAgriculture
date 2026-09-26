import assert from 'node:assert/strict';
import test from 'node:test';
import { CROP_IDS, CROP_CATALOG, requireCropId } from '../src/data/cropCatalog.ts';
import { newSupply, resolveSupply, chooseSupplyCrop } from '../src/game/simulation/supplyUnits.ts';
import { createInitialState } from '../src/game/state/reducer.ts';
import { harvestCrop } from '../src/game/simulation/crops.ts';

test('all six crops grow; research produces samples, never edible yield', () => {
  assert.deepEqual(CROP_IDS, ['lettuce', 'radish', 'chili-pepper', 'potato', 'soybean', 'arabidopsis']);
  assert.throws(() => requireCropId('wheat'));
  assert.throws(() => requireCropId('__proto__'));
  for (const crop of CROP_IDS) {
    let state = newSupply({ solar: 2, recyclers: 1, thermal: 1, batteries: 1, crops: [crop] });
    for (let i = 0; i < CROP_CATALOG[crop].cycle; i++) state = resolveSupply(state).next;
    assert.equal(state.progress[0], 0);
    assert.equal(state.harvested[0], CROP_CATALOG[crop].yield);
    assert.equal(state.research[0], CROP_CATALOG[crop].researchYield);
  }
  let research = newSupply({ solar: 2, recyclers: 1, thermal: 1, batteries: 1, crops: ['arabidopsis'] });
  research = chooseSupplyCrop(resolveSupply(research).next, 0, 'radish');
  research = resolveSupply(resolveSupply(research).next).next;
  assert.equal(research.config.crops[0], 'radish');
  assert.equal(research.research[0], 1);
  assert.equal(research.harvested[0], 0);
  assert.equal(research.progress[0], 0);
});

test('legacy harvest adapter also excludes research from food and crop scores', () => {
  const state = createInitialState('test', 'test', 'challenge');
  state.modules = [{ id: 'greenhouse', moduleId: 'greenhouse-compact', x: 0, y: 0, rotation: 0, integrity: 1 }];
  state.crops = [{ moduleId: 'greenhouse', slotIndex: 0, wateredThisCycle: false, crop: 'arabidopsis', growth: 3, ready: true, water: 'medium', light: 'medium', temperature: 'medium' }];
  const result = harvestCrop(state, 'greenhouse', { delivery: { greenhouse: { power: 1, water: 1 } }, net: { power: 0, water: 0, oxygen: 0, food: 0 }, bottlenecks: [] });
  assert.deepEqual(result, { yield: 0, food: 0, research: 1 });
});
