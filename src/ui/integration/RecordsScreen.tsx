'use client';
import { useEffect, useState } from 'react';
import type { LeaderboardCategory } from '../../backend/runs';
import { Leaderboard, type LeaderboardRow } from '../Leaderboard';
const columns = { overall: 'score_total', production: 'score_production', stability: 'score_stability', efficiency: 'score_efficiency', resilience: 'score_resilience' } as const;
export function RecordsScreen() {
  const [category, setCategory] = useState<LeaderboardCategory>('overall');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(undefined); setRows([]);
    fetch(`/api/leaderboard?category=${category}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Mission records are temporarily unavailable.');
      const data = await response.json();
      if (!Array.isArray(data.rows)) throw new Error('Mission records could not be read.');
      const mapped: LeaderboardRow[] = data.rows.map((row: Record<string, unknown>, index: number) => {
        const score = Number(row[columns[category]]);
        if (typeof row.id !== 'string' || typeof row.nickname !== 'string' || typeof row.mode !== 'string' || row[columns[category]] == null || !Number.isFinite(score) || typeof row.passed !== 'boolean') throw new Error('Mission records could not be read.');
        // Preserve API order. Rank here is display position; no local scoring or tie rules.
        return { id: row.id, nickname: row.nickname, mode: row.mode, score, passed: row.passed, rank: index + 1 };
      });
      if (!controller.signal.aborted) setRows(mapped);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, retry]);
  return <Leaderboard category={category} rows={rows} onCategoryChange={setCategory} loading={loading} error={error} onRetry={() => setRetry(value => value + 1)} />;
}
