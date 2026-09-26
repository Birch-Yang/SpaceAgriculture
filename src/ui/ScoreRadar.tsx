import type { ReportSnapshot } from '../game/state/reportSnapshot';
import { reportRadarAxes } from '../game/simulation/reportRadar';
import s from './report.module.css';

type Score = ReportSnapshot['score'];

export function ScoreRadar({ score }: { score: Score }) {
  const axes = reportRadarAxes(score);
  if (!axes.length) return <p className={s.radarUnavailable}>Detailed rule scores are unavailable for this archived run.</p>;
  const count = axes.length;
  const cx = 250; const cy = 205; const radius = 130;
  const point = (index: number, fraction: number) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    return { x: cx + Math.cos(angle) * radius * fraction, y: cy + Math.sin(angle) * radius * fraction };
  };
  const coordinates = (fraction: number) => axes.map((_, index) => {
    const { x, y } = point(index, fraction);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return <figure className={s.radar}>
    <figcaption><span className={s.eyebrow}>MULTIDIMENSIONAL SCORE</span><strong>Mission profile</strong>
      <small>Each axis shows the share earned in that category.</small></figcaption>
    <svg viewBox="0 0 500 430" role="img" aria-label={`Mission score radar: ${axes.map((axis) => `${axis.label} ${axis.earned} of ${axis.max}`).join(', ')}`}>
      {[.2, .4, .6, .8, 1].map((ring) => <polygon key={ring} points={coordinates(ring)} className={s.radarRing} />)}
      {axes.map((axis, index) => { const end = point(index, 1); return <line key={axis.label} x1={cx} y1={cy} x2={end.x} y2={end.y} className={s.radarAxis} />; })}
      <polygon points={axes.map((axis, index) => { const { x, y } = point(index, axis.value); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ')} className={s.radarShape} />
      {axes.map((axis, index) => {
        const dot = point(index, axis.value);
        const label = point(index, 1.33);
        const anchor = label.x < cx - 20 ? 'end' : label.x > cx + 20 ? 'start' : 'middle';
        return <g key={axis.label}><circle cx={dot.x} cy={dot.y} r="5" className={s.radarDot} />
          <text x={label.x} y={label.y} textAnchor={anchor} className={s.radarLabel}>{axis.label}<tspan x={label.x} dy="17" className={s.radarValue}>{axis.earned.toFixed(1)} / {axis.max}</tspan></text></g>;
      })}
    </svg>
    <ul className={s.radarLegend} aria-label="Score by dimension">{axes.map((axis) =>
      <li key={axis.label}><span>{axis.label}</span><strong>{axis.earned.toFixed(1)} / {axis.max}</strong></li>)}</ul>
    {score.usedFallback && <p className={s.radarNote}>Strategy is omitted until an AI evaluation is available. The displayed total uses the stated rules-only fallback.</p>}
  </figure>;
}
