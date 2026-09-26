import type { GameState } from '../game/state/types';
import { Panel, Status, PixelAsset, type Severity } from './primitives';
import s from './ui.module.css';
type ResourceName = keyof GameState['resources'];
export type ResourcePanelProps = {
  state: Pick<GameState, 'budget' | 'ap' | 'turn' | 'level' | 'resources' | 'production'>;
  status?: Partial<Record<ResourceName, Severity>>;
  units?: Partial<Record<ResourceName, string>>;
  productionTargets?: { crop: number; meat: number };
};
export function ResourcePanel({ state, status, units, productionTargets }: ResourcePanelProps) {
  return <Panel title="Outpost systems" eyebrow="Live telemetry"><dl className={s.metrics}>{[['Construction Budget', state.budget], ['AP', state.ap], ['Turn', state.turn], ['Level', state.level]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><dl className={s.resources}>{(Object.keys(state.resources) as ResourceName[]).map(key => <div key={key}><dt><PixelAsset name={key} folder="ui" size={24} /> {key}</dt><dd>{state.resources[key].toLocaleString()} <small>{units?.[key] ?? ''}</small></dd><Status severity={status?.[key]} /></div>)}</dl><dl className={s.metrics}><div><dt>Crop cumulative production</dt><dd>{state.production.cropCumulative.toLocaleString()}{productionTargets && <small> / {productionTargets.crop}</small>}</dd></div><div><dt>Meat cumulative production</dt><dd>{state.production.meatCumulative.toLocaleString()}{productionTargets && <small> / {productionTargets.meat}</small>}</dd></div></dl><p className={s.muted}>Production targets count total harvests, not remaining inventory.</p></Panel>;
}
