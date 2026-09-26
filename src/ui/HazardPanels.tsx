import type { ForecastState, HazardType } from '../game/state/types';
import { hazardDescriptions, tutorialHints, type TutorialHintId } from '../content/copy';
import { Panel, PixelAsset } from './primitives';
import s from './ui.module.css';
export function ForecastPanel({ forecast }: { forecast: ForecastState }) {
  return <Panel title="Regional forecast" eyebrow={forecast.window ?? "Outlook / timing uncertain"}><dl className={s.stats}><div><dt>Solar Activity</dt><dd>{forecast.solar}</dd></div><div><dt>Thermal Volatility</dt><dd>{forecast.thermal}</dd></div><div><dt>Impact Risk</dt><dd>{forecast.impact}</dd></div>{forecast.systems && <div><dt>System Disruption</dt><dd>{forecast.systems}</dd></div>}</dl><p className={s.muted}>Risk bands follow the mission hazard plan. Event timing remains uncertain.</p></Panel>;
}
export function HazardAlert({ type, detail }: { type: HazardType; detail?: string }) {
  const hazard = hazardDescriptions[type];
  return <div role="alert" className={`${s.notice} ${s.warning}`}><div className={s.row}><PixelAsset name={type} folder="ui" /><h3>{hazard.title}</h3></div><p>{detail ?? hazard.description}</p><p>{hazard.inspect}</p></div>;
}
export function CrisisOverlay({ trigger, recoveryTurn, onInspect }: { trigger: string; recoveryTurn: number; onInspect: () => void }) {
  return <section className={`${s.notice} ${s.critical}`} role="alert" aria-label="Crisis"><p className={s.eyebrow}>CRITICAL SYSTEM FAILURE</p><h2>One turn to recover.</h2><p>{trigger}</p><p>Restore critical systems by turn {recoveryTurn}.</p><button className={s.button} onClick={onInspect}>Inspect systems</button></section>;
}
export function RecoverySuccess() { return <div role="status" className={`${s.notice} ${s.normal}`}><h2>Recovery confirmed.</h2><p>Critical systems recovered. Your mission continues.</p></div>; }
export function MissionFailure({ reason, onReport }: { reason: string; onReport: () => void }) { return <section className={`${s.notice} ${s.critical}`}><h2>Mission ended</h2><p>{reason}</p><p>Every run is a chance to understand the trade-offs.</p><button className={s.button} onClick={onReport}>Review mission</button></section>; }
export function TutorialHint({ mode, level, hint }: { mode: 'challenge' | 'progressive'; level: number; hint?: TutorialHintId }) {
  return mode === 'progressive' && level === 1 && hint ? <aside className={s.hint}><span className={s.eyebrow}>Field guide</span><p>{tutorialHints[hint]}</p></aside> : null;
}
