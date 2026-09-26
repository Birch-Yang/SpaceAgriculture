import { getReport } from '../../backend/runs';
import type { MissionReport as ReportData } from '../../ai/report';
import type { ReportSnapshot } from '../../game/state/reportSnapshot';
import { EmptyState } from '../primitives';
import { ReportExperience } from './ReportExperience';

const fields = ['overview', 'production', 'stability', 'layout', 'disasterResponse', 'agriculture', 'missionControl', 'scientificContext', 'strategySuggests'] as const;

function isReport(value: unknown): value is ReportData {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (item.result === 'PASS' || item.result === 'FAIL') && fields.every((key) => typeof item[key] === 'string')
    && typeof item.usedFallback === 'boolean' && Array.isArray(item.sourceIds)
    && item.sourceIds.every((id) => typeof id === 'string');
}

export async function ReportScreen({ runId }: { runId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return <EmptyState title="Invalid mission ID">Open a completed mission report to continue.</EmptyState>;
  let initial: ReportSnapshot | undefined;
  try {
    const row = await getReport(runId);
    const summary = row?.summary_json as { report?: unknown; usedFallback?: boolean } | null;
    if (row && isReport(summary?.report) && row.score_total != null && Number.isFinite(Number(row.score_total))) {
      const hasBreakdown = [row.score_production, row.score_stability, row.score_efficiency,
        row.score_resilience, row.score_budget].every((value) => value != null && Number.isFinite(Number(value)));
      const breakdown = hasBreakdown ? {
        production: Number(row.score_production) || 0, stability: Number(row.score_stability) || 0,
        efficiency: Number(row.score_efficiency) || 0, resilience: Number(row.score_resilience) || 0,
        budget: Number(row.score_budget) || 0, total: Number(row.score_rules) || 0,
      } : undefined;
      initial = { version: 1, runId, nickname: row.nickname, report: summary.report, saved: true,
        score: { total: Number(row.score_total), rules: Number(row.score_rules), llm: Number(row.score_llm),
          usedFallback: !!summary.usedFallback, breakdown } };
    }
  } catch { /* A browser-local report may still be available. */ }
  return <ReportExperience runId={runId} initial={initial} />;
}
