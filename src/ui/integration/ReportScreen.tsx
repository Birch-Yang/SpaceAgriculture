import { getReport } from '../../backend/runs';
import type { MissionReport as ReportData } from '../../ai/report';
import { MissionReport } from '../MissionReport';
import { curatedSources } from '../../content/sources';
import { EmptyState } from '../primitives';
const fields = ['overview','production','stability','layout','disasterResponse','agriculture','missionControl','scientificContext','strategySuggests'] as const;
function isReport(value: unknown): value is ReportData {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (item.result === 'PASS' || item.result === 'FAIL') && fields.every(key => typeof item[key] === 'string') && typeof item.usedFallback === 'boolean' && Array.isArray(item.sourceIds) && item.sourceIds.every(id => typeof id === 'string');
}
export async function ReportScreen({ runId }: { runId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return <EmptyState title="Invalid mission ID">Open a saved mission report to continue.</EmptyState>;
  try {
    const row = await getReport(runId);
    if (!row) return <EmptyState title="Report not available yet">This mission may not have been saved. Try again after submission.</EmptyState>;
    const summary = row.summary_json as { report?: unknown; usedFallback?: boolean } | null;
    if (!isReport(summary?.report) || row.score_total == null || !Number.isFinite(Number(row.score_total))) return <EmptyState title="Report incomplete">The stored report is missing presentation data.</EmptyState>;
    return <MissionReport report={summary.report} nickname={row.nickname} scores={{ total: Number(row.score_total), usedFallback: summary.usedFallback }} sources={curatedSources} />;
  } catch { return <EmptyState title="Report temporarily unavailable">Please reload to retry.</EmptyState>; }
}
