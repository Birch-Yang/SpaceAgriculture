'use client';
import { useEffect, useState } from 'react';
import type { LeaderboardCategory } from '../../backend/runs';
import { readLastSavedRun } from '../../game/state/lastRun';
import { Leaderboard, type LeaderboardRow } from '../Leaderboard';

const columns = { overall: 'score_total', production: 'score_production', stability: 'score_stability', efficiency: 'score_efficiency', resilience: 'score_resilience' } as const;
type CurrentRank = { id: string; nickname: string; mode: string; score: number; passed: boolean; rank: number };

export function RecordsScreen({ initial }: { initial?: { rows: LeaderboardRow[]; total: number } }) {
  const [category, setCategory] = useState<LeaderboardCategory>('overall');
  const [runId, setRunId] = useState<string>();
  const [rows, setRows] = useState<LeaderboardRow[]>(initial?.rows ?? []);
  const [current, setCurrent] = useState<CurrentRank | null>(null);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  useEffect(() => { setRunId(readLastSavedRun()); }, []);
  useEffect(() => {
    if (initial && category === 'overall' && !runId && retry === 0) return;
    const controller = new AbortController();
    setLoading(true); setError(undefined); setRows([]); setCurrent(null);
    const query = new URLSearchParams({ category });
    if (runId) query.set('runId', runId);
    fetch(`/api/leaderboard?${query}`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Mission records are temporarily unavailable.');
      if (!Array.isArray(data.rows)) throw new Error('Mission records could not be read.');
      const mapped: LeaderboardRow[] = data.rows.map((row: Record<string, unknown>) => {
        const score = Number(row[columns[category]]);
        if (typeof row.id !== 'string' || typeof row.nickname !== 'string' || typeof row.mode !== 'string'
          || row[columns[category]] == null || !Number.isFinite(score) || typeof row.passed !== 'boolean'
          || !Number.isInteger(row.rank) || Number(row.rank) < 1) throw new Error('Mission records could not be read.');
        return { id: row.id, nickname: row.nickname, mode: row.mode, score, passed: row.passed, rank: Number(row.rank) };
      });
      if (!controller.signal.aborted) {
        setRows(mapped);
        setTotal(Number.isInteger(data.total) ? data.total : mapped.length);
        setCurrent(data.current && typeof data.current.id === 'string' && Number.isInteger(data.current.rank) ? data.current : null);
      }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Mission records unavailable.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, retry, runId, initial]);
  return <Leaderboard category={category} rows={rows} total={total} current={current} currentRunId={runId}
    onCategoryChange={setCategory} loading={loading} error={error} onRetry={() => setRetry(value => value + 1)} />;
}
