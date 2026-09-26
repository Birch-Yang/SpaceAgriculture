'use client';

import { useMemo, useState } from 'react';
import { GameCanvas } from '../../game/phaser/GameCanvas';
import { createInitialState } from '../../game/state/reducer';
import { MODULE_BY_ID } from '../../data/modules';
import { BuildingPortrait } from '../BuildingPortrait';
import { newSupply, resolveSupply, chooseSupplyCrop, SUPPLY_CROPS, type SupplyConfig, type SupplyCrop, type SupplyReport } from '../../game/simulation/supplyUnits';
import { CropPicker } from './CropPicker';
import { CROP_IDS } from '../../data/cropCatalog';
import s from './supply.module.css';

const configs = [
  { label: 'Reference base', config: newSupply().config },
  { label: 'Six-crop showcase', config: { solar: 3, recyclers: 1, thermal: 2, batteries: 1, crops: [...CROP_IDS] } },
  { label: 'Power shortage', config: { ...newSupply().config, solar: 1, batteries: 0 } },
  { label: 'Thermal overload', config: { ...newSupply().config, solar: 3, crops: ['lettuce', 'soybean', 'potato', 'lettuce'] as SupplyCrop[] } },
  { label: 'Water shortage', config: { solar: 4, recyclers: 1, thermal: 2, batteries: 1, crops: Array<SupplyCrop>(6).fill('soybean') } },
];
const countFields = [
  { key: 'solar', label: 'Solar array', module: 'solar-array', note: '+12 power', max: 4 },
  { key: 'recyclers', label: 'Water recycler', module: 'water-recycler', note: '+12 water · −1 power', max: 3 },
  { key: 'thermal', label: 'Thermal unit', module: 'utility-thermal', note: '+4 coverage · −2 power', max: 3 },
  { key: 'batteries', label: 'Battery', module: 'battery', note: 'Stores 6 power', max: 2 },
] as const;
const fmt = (n: number) => Number(n.toFixed(2));

export function SupplyPlayground() {
  const [state, setState] = useState(() => newSupply());
  const [history, setHistory] = useState<SupplyReport[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('Configure your base, then advance a turn.');
  const last = history.at(-1);
  const failed = !!last?.critical.length;
  const complete = state.turn === 12 || failed;
  const projection = useMemo(() => state.turn < 12 ? resolveSupply(state) : last!, [state, last]);
  const report = complete ? last! : projection;
  const total = state.harvested.reduce((a, b) => a + b, 0);
  const researchTotal = state.research.reduce((a, b) => a + b, 0);
  const map = useMemo(() => {
    const snapshot = createInitialState('supply-preview', 'SUPPLY LAB', 'challenge');
    const ids = ['habitat-core', 'oxygen-generator', 'communication-tower',
      ...Array<string>(state.config.solar).fill('solar-array'),
      ...Array<string>(state.config.recyclers).fill('water-recycler'),
      ...Array<string>(state.config.thermal).fill('utility-thermal'),
      ...Array<string>(state.config.batteries).fill('battery'),
      ...state.config.crops.map(() => 'greenhouse-compact')];
    snapshot.modules = ids.map((moduleId, i) => ({ id: `supply-${i}`, moduleId, x: (i % 5) * 3, y: Math.floor(i / 5) * 3, rotation: 0, integrity: 1 }));
    const offset = ids.length - state.config.crops.length;
    snapshot.crops = state.config.crops.map((crop, i) => ({ moduleId: `supply-${offset + i}`, slotIndex: 0, wateredThisCycle: false, crop, growth: state.progress[i], ready: false, water: 'medium', light: 'medium', temperature: 'medium' }));
    snapshot.phase = 'operation';
    snapshot.turn = state.turn;
    return snapshot;
  }, [state]);
  const selectedModule = map.modules.find(module => module.id === selected);
  const selectedDefinition = selectedModule && MODULE_BY_ID.get(selectedModule.moduleId);

  function reset(config = state.config) {
    setState(newSupply(config)); setHistory([]); setSelected(null); setPicker(null); setFeedback('Base ready. Click a greenhouse or Choose crop to plan your planting.');
  }
  function change(key: 'solar' | 'recyclers' | 'thermal' | 'batteries', value: number) {
    if (!state.turn) reset({ ...state.config, [key]: value });
  }
  function setCrop(index: number, crop: SupplyCrop) {
    if (complete) return;
    const queued = state.progress[index] > 0;
    setState(chooseSupplyCrop(state, index, crop)); setPicker(null);
    setFeedback(`Greenhouse ${index + 1}: ${queued ? crop === state.config.crops[index] ? 'Keeping ' : 'Next batch: ' : 'Selected '}${SUPPLY_CROPS[crop].label}.`);
  }
  function selectModule(id: string | null) {
    setSelected(id);
    const cropIndex = map.crops.findIndex(crop => crop.moduleId === id);
    if (cropIndex >= 0 && !complete) setPicker(cropIndex);
  }
  function advance() {
    if (complete) return;
    const result = resolveSupply(state);
    setState(result.next); setHistory(current => [...current, result]);
    setFeedback(result.critical.length ? result.critical.join('; ') : `Turn ${result.turn} complete · Harvest +${result.harvest.reduce((a, b) => a + b, 0)} · Samples +${result.researchHarvest.reduce((a, b) => a + b, 0)} · ${result.event}`);
  }
  const capacityCards = [
    { label: 'Power', supply: report.generation, demand: report.powerDemand, note: `Battery backup ${fmt(report.discharge)} · Stored  ${fmt(state.battery)}/${state.config.batteries * 6}`, icon: '☀' },
    { label: 'Water', supply: report.waterSupply, demand: report.waterDemand, note: 'Processing capacity, adjusted for supplied power', icon: '◈' },
    { label: 'Thermal', supply: report.thermalSupply, demand: report.thermalNeed, note: 'Habitat first · Each greenhouse needs 1 unit', icon: '◎' },
  ];
  return <main className={s.lab}>
    <header className={s.header}><div><p className={s.eyebrow}>AGRONAUT / SYSTEMS LAB</p><h1>Connect a living outpost.</h1><p>Balance power, water, and thermal capacity to keep your crops growing.</p></div><div className={s.turn}><span>Turns completed</span><strong>{state.turn}<small> / 12</small></strong><span>About 14 days per turn</span></div></header>
    <div className={s.presets}><span>Try a scenario</span>{configs.map(preset => <button key={preset.label} onClick={() => reset(preset.config)}>{preset.label}</button>)}</div>
    <div className={s.summaryLabel}>{complete ? 'Final turn summary' : `Turn ${state.turn + 1} supply forecast`} <span>{report.event}</span></div>
    <section className={s.metrics}>{capacityCards.map(card => <article className={`${s.metric} ${card.supply < card.demand ? s.warning : ''}`} key={card.label}><div><span>{card.icon} {card.label}</span><b>{card.supply < card.demand ? 'Shortfall' : 'Sufficient'}</b></div><strong>{fmt(card.supply)}<small> / {fmt(card.demand)}</small></strong><p>Supply / demand</p><div className={s.track}><i style={{ width: `${Math.min(100, card.supply / Math.max(1, card.demand) * 100)}%` }} /></div><p>{card.note}</p></article>)}</section>
    <div className={s.workspace}>
      <aside className={s.panel}><h2>Base configuration</h2><p className={s.muted}>{state.turn ? 'Configuration is locked during a run. Reset to change it.' : 'All facilities share supply. Adjust counts to see the effect.'}</p>
        {countFields.map(item => <div className={s.building} key={item.key}><BuildingPortrait category={MODULE_BY_ID.get(item.module)!.category} moduleId={item.module} /><div><b>{item.label}</b><small>{item.note}</small></div><div className={s.counter}><button aria-label={`Remove ${item.label}`} disabled={!!state.turn || state.config[item.key] === 0} onClick={() => change(item.key, state.config[item.key] - 1)}>−</button><span>{state.config[item.key]}</span><button aria-label={`Add ${item.label}`} disabled={!!state.turn || state.config[item.key] >= item.max} onClick={() => change(item.key, state.config[item.key] + 1)}>+</button></div></div>)}
        <div className={s.fixed}>Fixed facilities: habitat, oxygen generator, communications<br />Combined demand: 3 power, 2 water, 1 thermal.</div>
        <p className={s.muted}>Life support comes first. Greenhouses receive remaining supply in card order.</p>
      </aside>
      <section className={s.map}><div className={s.mapHeading}><span>South Pole Outpost</span><small>{map.modules.length} facilities · Click a greenhouse to choose crops</small></div><GameCanvas state={map} tool={{ kind: 'select' }} selectedId={selected} onAction={() => {}} onSelect={selectModule} onFeedback={setFeedback} /><div className={s.mapCaption}>{selectedDefinition ? `Selected: ${selectedDefinition.label}` : 'Click a greenhouse to choose crops · Shared supply; corridor distance is not modeled'}</div></section>
    </div>
    <section className={s.crops}>{state.config.crops.map((crop, i) => {
      const definition = SUPPLY_CROPS[crop];
      const coverage = report.coverage[i];
      return <article className={s.crop} key={i}><div className={s.cropHeading}><span>Greenhouse {String(i + 1).padStart(2, '0')}</span><button aria-label={`Greenhouse ${i + 1}: ${state.progress[i] > 0 ? 'Plan next batch' : 'Choose crop'}`} disabled={complete} onClick={() => setPicker(i)}>{state.progress[i] > 0 ? 'Plan next batch' : 'Choose crop'} ↗</button></div><h3>{definition.label}<small>{definition.cycle} turns to mature · Per batch: {definition.role === 'research' ? `${definition.researchYield} research samples` : `${definition.yield} harvest points`}</small></h3><div className={s.requirements}><span>Power {definition.power}</span><span>Water {definition.water}</span><span>Thermal {definition.thermal}</span></div><p>Growth progress <b>{fmt(state.progress[i])} / {definition.cycle}</b></p><div className={s.track}><i style={{ width: `${state.progress[i] / definition.cycle * 100}%` }} /></div>{state.nextCrops[i] && <div className={s.queuedCrop}>Next batch → {SUPPLY_CROPS[state.nextCrops[i]!].label} · Switches after harvest</div>}<p className={report.growth[i] < 1 ? s.alert : s.muted}>{complete ? 'Last turn' : 'Next turn'} growth +{fmt(report.growth[i])} · {definition.role === 'research' ? `Total samples: ${state.research[i]}` : `Total harvest: ${state.harvested[i]}`}</p><small>Power {Math.round(coverage.power * 100)}% / Water {Math.round(coverage.water * 100)}% / Thermal {Math.round(coverage.thermal * 100)}%</small></article>;
    })}</section>
    <section className={s.results}><div><span>Crop harvest · Research tracked separately</span><strong>{total}<small> / 180</small></strong><p>Research samples: {researchTotal} · Excluded from the crop target</p><p>{complete ? failed ? 'Life support failed · Run ended' : total >= 180 ? 'Target reached · Outpost operational' : 'Mission ended · Harvest target missed' : 'Crops harvest automatically and restart the following turn.'}</p></div><div className={s.history}>{history.length ? history.map(entry => <span key={entry.turn} title={entry.event}>T{entry.turn}<b>+{entry.harvest.reduce((a, b) => a + b, 0)}</b>{entry.researchHarvest.some(Boolean) && <small>Samples +{entry.researchHarvest.reduce((a, b) => a + b, 0)}</small>}</span>) : <p>Advance a turn to record your harvests here.</p>}</div></section>
    <footer className={s.command}><p role="status">{feedback}</p><button onClick={() => reset()}>Reset run</button><button className={s.primary} disabled={complete} onClick={advance}>{complete ? 'Run complete' : `End turn ${state.turn + 1} →`}</button></footer>
    <p className={s.disclaimer}>Local supply prototype: a 12-turn capacity model with six crops, research samples, batteries, and scripted hazards. Construction budgets, AP, oxygen reserves, and emergency rescue are not connected yet. Refreshing resets the run. Crop lighting ratios reference experiments; equipment capacities and hazards are game settings.</p>
    {picker !== null && <CropPicker key={picker} state={state} index={picker} onChoose={crop => setCrop(picker, crop)} onClose={() => setPicker(null)} />}
  </main>;
}
