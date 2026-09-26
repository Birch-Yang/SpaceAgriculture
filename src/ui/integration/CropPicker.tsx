'use client';
import { useEffect, useRef, useState } from 'react';
import { AgricultureSprite } from '../AgricultureSprite';
import { SUPPLY_CROPS, type SupplyCrop, type SupplyState } from '../../game/simulation/supplyUnits';
import s from './supply.module.css';

export function CropPicker({ state, index, onChoose, onClose }: { state: SupplyState; index: number; onChoose: (crop: SupplyCrop) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState<SupplyCrop>(state.nextCrops[index] ?? state.config.crops[index]);
  const current = state.config.crops[index];
  const queued = state.progress[index] > 0;
  const selected = SUPPLY_CROPS[choice];
  const futureCrops = state.config.crops.map((crop, i) => i === index ? choice : state.nextCrops[i] ?? crop);
  const power = 3 + state.config.recyclers + state.config.thermal * 2 + futureCrops.reduce((sum, crop) => sum + SUPPLY_CROPS[crop].power, 0);
  const water = 2 + futureCrops.reduce((sum, crop) => sum + SUPPLY_CROPS[crop].water, 0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className={s.picker} aria-labelledby="crop-picker-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <header className={s.pickerHeader}><div><p>GREENHOUSE {String(index + 1).padStart(2, '0')} / PLANTING PLAN</p><h2 id="crop-picker-title">What will you grow here?</h2></div><button onClick={onClose} aria-label="Close crop picker">✕</button></header>
    <p className={s.pickerHint}>{queued ? `Your current ${SUPPLY_CROPS[current].label} keeps growing. The new crop starts after harvest. Select the current crop to cancel a planned change.` : 'Your choice updates this greenhouse’s resource needs. Growth begins next turn.'}</p>
    <div className={s.seedChoices}>{(Object.keys(SUPPLY_CROPS) as SupplyCrop[]).map(crop => { const data = SUPPLY_CROPS[crop]; return <button key={crop} className={`${s.seedCard} ${choice === crop ? s.seedSelected : ''}`} aria-pressed={choice === crop} aria-label={`Select ${data.label}`} onClick={() => setChoice(crop)}><span className={s.seedBadge}>{choice === crop ? '✓ Selected' : current === crop ? 'Current crop' : 'Available'}</span><div className={s.seedArt}><AgricultureSprite crop={crop} /></div><strong>{data.label}</strong><span className={s.seedDescription}>{data.description}</span><span className={s.seedStats}><b>{data.cycle} turns<small>Growth cycle</small></b><b>{data.role === 'research' ? data.researchYield : data.yield} {data.role === 'research' ? 'samples' : 'points'}<small>{data.role === 'research' ? 'Research samples · Not food' : 'Harvest per batch'}</small></b></span><span className={s.seedNeeds}>Power {data.power} · Water {data.water} · Thermal {data.thermal} / turn</span><span className={s.evidence}>{data.evidence === 'provisional' ? 'Provisional balance' : 'Reference-informed'} · {data.role === 'research' ? 'Research plant' : 'Food crop'}</span></button>; })}</div>
    <div className={s.pickerPreview}><strong>Planned normal supply</strong><span>Power {state.config.solar * 12} / {power}</span><span>Water {state.config.recyclers * 12} / {water}</span><small>Supply / demand · Includes other planned crops; excludes hazards, power-related capacity loss, and batteries</small>{power > state.config.solar * 12 && <p>Power shortfall: lower-priority greenhouses may slow down or stop.</p>}{water > state.config.recyclers * 12 && <p>Water shortfall: lower-priority greenhouses may slow down or stop.</p>}{queued && 12 - state.turn < selected.cycle && <p>Not enough turns remain for a full cycle of this crop.</p>}</div>
    <footer className={s.pickerFooter}><span>Species illustrations · Arabidopsis is not food · Choosing crops costs no AP</span><button onClick={onClose}>Cancel</button><button className={s.primary} onClick={() => onChoose(choice)}>{queued ? choice === current ? 'Keep current crop' : `Plan ${selected.label} next` : `Plant ${selected.label}`}</button></footer>
  </dialog>;
}
