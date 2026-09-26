import { AppFrame } from '../../src/ui/integration/AppFrame';
import { RecordsScreen } from '../../src/ui/integration/RecordsScreen';
import { getLeaderboard } from '../../src/backend/runs';
export const dynamic = 'force-dynamic';
export default async function LeaderboardPage() {
  let initial: { rows: Array<{ id: string; nickname: string; mode: string; passed: boolean; rank: number; score: number }>; total: number } | undefined;
  try {
    const board = await getLeaderboard('overall');
    initial = { total: board.total, rows: board.rows.map(row => ({ id: row.id, nickname: row.nickname, mode: row.mode,
      passed: row.passed, rank: row.rank, score: Number(row.score_total) })) };
  } catch { /* The client shows a retryable error when public records are unavailable. */ }
  return <AppFrame wide><RecordsScreen initial={initial} /></AppFrame>;
}
