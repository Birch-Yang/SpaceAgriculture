'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { readReportSnapshot, writeReportSnapshot, type ReportSnapshot } from '../../game/state/reportSnapshot';
import { MissionReport } from '../MissionReport';
import { curatedSources } from '../../content/sources';
import s from '../report.module.css';

export function ReportExperience({ runId, initial }: { runId: string; initial?: ReportSnapshot }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<ReportSnapshot | undefined>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (initial?.saved) setSnapshot(initial);
  }, [initial]);

  useEffect(() => {
    const sync = () => {
      const local = readReportSnapshot(runId);
      setSnapshot((current) => current?.saved ? current : local ?? current);
    };
    const onUpdate = (event: Event) => {
      if ((event as CustomEvent<string>).detail === runId) sync();
    };
    sync();
    setHydrated(true);
    window.addEventListener('agronaut:report-updated', onUpdate);
    return () => window.removeEventListener('agronaut:report-updated', onUpdate);
  }, [runId]);

  async function retry() {
    if (!snapshot?.transcript || busy) return;
    setBusy(true); setError(undefined);
    try {
      const response = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: snapshot.transcript }) });
      const data = await response.json() as { runId?: string; score?: ReportSnapshot['score']; report?: ReportSnapshot['report'];
        saved?: boolean; retryable?: boolean; reason?: string; error?: string; code?: string };
      if (response.status === 409 && data.code === 'already_saved') {
        const updated = { ...snapshot, saved: true, pending: false, reason: undefined };
        writeReportSnapshot(updated); setSnapshot(updated); router.refresh(); return;
      }
      if (!response.ok || !data.score || !data.report) throw new Error(data.error ?? 'Report submission unavailable');
      const updated: ReportSnapshot = { ...snapshot, score: { ...data.score, breakdown: snapshot.score.breakdown },
        report: data.report, saved: !!data.saved, pending: false, retryable: data.retryable, reason: data.reason };
      writeReportSnapshot(updated); setSnapshot(updated);
      if (updated.saved) router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Report submission unavailable'); }
    finally { setBusy(false); }
  }

  if (!snapshot && !hydrated) return <main className={s.empty} role="status"><p className={s.eyebrow}>MISSION ARCHIVE</p><h1>Opening your mission report…</h1></main>;
  if (!snapshot) return <main className={s.empty}>
    <p className={s.eyebrow}>MISSION ARCHIVE / REPORT UNAVAILABLE</p>
    <h1>This report is not available in this browser.</h1>
    <p>Saved reports can be opened again by their link. A local report is available only in the browser session that completed the mission.</p>
    <div className={s.actions}><Link href="/game">New Mission</Link><Link href="/">Back to Main</Link></div>
  </main>;

  return <MissionReport report={snapshot.report} nickname={snapshot.nickname} scores={snapshot.score}
    sources={curatedSources} runId={runId} saved={snapshot.saved} pending={snapshot.pending}
    reason={error ?? snapshot.reason} retryable={snapshot.retryable !== false && !!snapshot.transcript}
    onRetry={retry} retryBusy={busy} />;
}
