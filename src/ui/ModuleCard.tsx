import type { ModuleDefinition } from '../game/state/types';
import { moduleDescriptions } from '../content/copy';
import { PixelAsset } from './primitives';
import s from './ui.module.css';
export type ModuleCardProps = { module: ModuleDefinition; variant?: 'Compact' | 'Standard' | 'Industrial'; selected?: boolean; disabledReason?: string; onSelect?: (id: string) => void };
export function ModuleCard({ module: m, variant, selected, disabledReason, onSelect }: ModuleCardProps) {
  const stats = [['Cost', m.cost], ['Footprint', `${m.footprint.w} × ${m.footprint.h}`], ['Water demand / supply', `${m.flow.waterDemand ?? 0} / ${m.flow.waterSupply ?? 0}`], ['Power demand / supply', `${m.flow.powerDemand ?? 0} / ${m.flow.powerSupply ?? 0}`], ['Heat', m.heatOutput], ...(m.baseYield ? [['Base Yield', m.baseYield]] : []), ['Resilience', m.resilience]];
  return <article className={`${s.panel} ${selected ? s.selected : ''}`}><div className={s.row}><PixelAsset name={m.category} /><div><h3>{m.label}</h3>{variant && <span className={s.badge}>{variant}</span>}</div></div><p className={s.muted}>{moduleDescriptions[m.category]}</p><dl className={s.stats}>{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{onSelect && <button className={s.button} disabled={!!disabledReason} aria-pressed={!!selected} onClick={() => onSelect(m.id)}>{selected ? 'Selected' : 'Select module'}</button>}{disabledReason && <p className={s.muted}>{disabledReason}</p>}</article>;
}
