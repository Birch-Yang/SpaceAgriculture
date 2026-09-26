import Link from 'next/link';
import { AppFrame } from '../../../src/ui/integration/AppFrame';
import { RecordExperience } from '../../../src/ui/integration/RecordExperience';
import { getReport } from '../../../src/backend/runs';
import { createReplayFrames } from '../../../src/game/state/replayFrames';
import { createRunHistory } from '../../../src/game/state/runHistory';
import { parseTranscript, replayTranscript } from '../../../src/game/state/transcript';
import { buildRunSummary } from '../../../src/ai/schemas';
import { fallbackLayoutAssessment, reportWordCount, MIN_LAYOUT_ASSESSMENT_WORDS } from '../../../src/ai/report';
import s from '../../../src/ui/integration/archive.module.css';

export const dynamic = 'force-dynamic';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Unavailable({ message }: { message: string }) {
  return <AppFrame wide><div className={s.page}><header className={s.hero}><div className={s.heroInner}>
    <p className={s.eyebrow}>Mission archive / record unavailable</p><h1>Mission log unavailable.</h1><p>{message}</p>
  </div></header><div className={s.body}><Link className={s.actionLink} href="/leaderboard">Back to records</Link></div></div></AppFrame>;
}

export default async function RecordPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  if (!uuid.test(runId)) return <Unavailable message="The mission ID is invalid." />;
  try {
    const row = await getReport(runId);
    if (!row) return <Unavailable message="This saved mission was not found." />;
    const stored = row.summary_json as { replay?: { transcript?: unknown } } | null;
    if (!stored?.replay?.transcript) return <Unavailable message="This older mission has no replayable action history." />;
    const transcript = parseTranscript(stored.replay.transcript);
    if (transcript.runId !== runId) throw new Error('Run ID mismatch');
    const final = replayTranscript(transcript);
    const frames = createReplayFrames(transcript);
    const history = createRunHistory(transcript, frames, final.turnRecords);
    const runSummary = buildRunSummary(final, transcript);
    const archived = stored as { report?: { layoutAssessment?: unknown } };
    const savedAnalysis = archived.report?.layoutAssessment;
    const layoutAssessment = typeof savedAnalysis === 'string' && reportWordCount(savedAnalysis) >= MIN_LAYOUT_ASSESSMENT_WORDS
      ? savedAnalysis : fallbackLayoutAssessment(runSummary);
    return <AppFrame wide><RecordExperience runId={runId} nickname={row.nickname} mode={transcript.mode} rulesetVersion={transcript.version}
      passed={!!row.passed} score={Number(row.score_total)} frames={frames} {...history}
      layoutAssessment={layoutAssessment} layoutMetrics={runSummary.layoutMetrics} /></AppFrame>;
  } catch {
    return <Unavailable message="The mission replay could not be opened. Please retry shortly." />;
  }
}
