import assert from 'node:assert/strict';
import test from 'node:test';
import { CROP_IDS, CROP_CATALOG, requireCropId } from '../src/data/cropCatalog.ts';
import { createInitialState } from '../src/game/state/reducer.ts';
import { growCrops, harvestCrop } from '../src/game/simulation/crops.ts';
import type { NetworkResult } from '../src/game/simulation/utilityGraph.ts';

const delivery: NetworkResult = {
  delivery: { greenhouse: { power: 1, water: 1 } },
  net: { power: 0, water: 0, oxygen: 0, food: 0 },
  bottlenecks: [],
};

test('official mission agriculture grows all six catalog crops and separates research from food', () => {
  assert.deepEqual(CROP_IDS, ['lettuce', 'radish', 'chili-pepper', 'potato', 'soybean', 'arabidopsis']);
  assert.throws(() => requireCropId('wheat'));
  assert.throws(() => requireCropId('__proto__'));
  for (const crop of CROP_IDS) {
    const state = createInitialState('test', 'test', 'challenge');
    state.modules = [{ id: 'greenhouse', moduleId: 'greenhouse-compact', x: 0, y: 0, rotation: 0, integrity: 1 }];
    state.crops = [{ moduleId: 'greenhouse', slotIndex: 0, wateredThisCycle: false, crop,
      growth: 0, ready: false, water: 'medium', light: 'medium', temperature: 'medium' }];
    for (let turn = 0; turn < 30 && !state.crops[0].ready; turn++) state.crops = growCrops(state, delivery).crops;
    assert.equal(state.crops[0].ready, true, crop);
    const harvest = harvestCrop(state, state.crops[0], delivery);
    if (CROP_CATALOG[crop].role === 'research') {
      assert.deepEqual(harvest, { yield: 0, food: 0, research: CROP_CATALOG[crop].researchYield });
    } else {
      assert.ok(harvest.yield > 0, crop);
      assert.ok(harvest.food > 0, crop);
      assert.equal(harvest.research, 0, crop);
    }
  }
});

test('mission submission accepts every current crop and rejects retired wheat', async () => {
  const { parseTranscript } = await import('../src/game/state/transcript.ts');
  const transcript = (crop: string) => ({ version: 1, runId: '00000000-0000-4000-8000-000000000001', nickname: 'crop check', mode: 'challenge', steps: [
    { kind: 'start' }, { kind: 'turn', actions: [{ type: 'PLANT_CROP', moduleId: 'greenhouse', crop }] },
  ] });
  for (const crop of CROP_IDS) assert.doesNotThrow(() => parseTranscript(transcript(crop)));
  assert.throws(() => parseTranscript(transcript('wheat')), /Invalid run step/);
});
