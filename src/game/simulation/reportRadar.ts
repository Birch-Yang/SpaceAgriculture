import type { ReportSnapshot } from '../state/reportSnapshot.ts';

export type RadarAxis = { label: string; earned: number; max: number; value: number };
const dimensions = [
  { key: 'production', label: 'Production', max: 28 },
  { key: 'stability', label: 'Stability', max: 24 },
  { key: 'efficiency', label: 'Efficiency', max: 8 },
  { key: 'resilience', label: 'Resilience', max: 6 },
  { key: 'budget', label: 'Budget', max: 4 },
] as const;

export function reportRadarAxes(score: ReportSnapshot['score']): RadarAxis[] {
  if (!score.breakdown) return [];
  const axes: RadarAxis[] = dimensions.map(({ key, label, max }) => ({
    label, max, earned: score.breakdown![key], value: Math.max(0, Math.min(1, score.breakdown![key] / max)),
  }));
  if (!score.usedFallback) axes.push({ label: 'Strategy', max: 30, earned: score.llm,
    value: Math.max(0, Math.min(1, score.llm / 30)) });
  return axes;
}
