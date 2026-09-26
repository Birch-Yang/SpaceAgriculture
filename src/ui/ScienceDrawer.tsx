import { curatedSources } from '../content/sources';
import { scientificFraming } from '../content/copy';
import s from './ui.module.css';
export function ScienceDrawer() {
  return <details className={s.scienceDrawer}><summary>Science &amp; Assumptions <span>Open field notes +</span></summary><div><p>{scientificFraming}</p><p>The crop illustrations show recognizable growth stages, not measured growth rates. Arabidopsis is presented as a research plant; sample readiness does not imply edible food production.</p><p>Water, light, temperature, and utility delivery are simplified in the game. Crop appearance does not change its simulated output.</p><ul>{curatedSources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.organization} · {source.shortContext}</p></li>)}</ul></div></details>;
}
