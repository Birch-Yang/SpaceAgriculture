'use client';
import Link from 'next/link';
import type { LeaderboardCategory } from '../backend/runs';
import s from './integration/archive.module.css';

export type LeaderboardRow = { id: string; nickname: string; mode: string; rank: number; score: number; passed: boolean };
export type LeaderboardProps = { category: LeaderboardCategory; rows: readonly LeaderboardRow[]; total?: number; currentRunId?: string;
  current?: LeaderboardRow | null; onCategoryChange: (category: LeaderboardCategory) => void; loading?: boolean; error?: string; onRetry?: () => void };

export function Leaderboard({ category, rows, total, currentRunId, current, onCategoryChange, loading, error, onRetry }: LeaderboardProps) {
  return <div className={s.page}>
    <header className={s.hero}><div className={s.heroInner}><p className={s.eyebrow}>Mission archive / player rank</p>
      <h1>Every outpost has a story.</h1><p>Compare completed missions, then open a record to trace the decisions, hazards and base layout behind its score.</p>
    </div></header>
    <div className={s.body}>
      <div className={s.summaryStrip}><span><strong>{total ?? rows.length}</strong> saved missions</span><span><strong>5</strong> score views</span><span>Scores tied at the same value share a rank</span></div>
      <div className={s.tabs} role="group" aria-label="Leaderboard category">{(['overall','production','stability','efficiency','resilience'] as const).map(item =>
        <button key={item} type="button" className={s.tab} aria-pressed={item === category} onClick={() => onCategoryChange(item)}>{item}</button>)}</div>
      {loading ? <div className={s.empty} role="status">Receiving mission records…</div>
        : error ? <div className={s.empty} role="alert"><h2>Records temporarily unavailable</h2><p>{error}</p>{onRetry && <button className={s.control} onClick={onRetry}>Try again</button>}</div>
          : <>
            {current ? <p className={s.notice} role="status"><strong>Your latest saved run:</strong> <Link href={`/records/${current.id}`}>{current.nickname}</Link> · #{current.rank} of {total ?? rows.length} · {category} {current.score}{!rows.some(row => row.id === current.id) ? ' · outside the displayed top records' : ''}</p>
              : <p className={s.cardNote}>Your personal rank appears after you save a mission on this browser. You can open any listed mission now.</p>}
            {!rows.length ? <div className={s.empty}><h2>The first harvest is still ahead.</h2><p>Completed missions will appear here.</p></div>
              : <div className={s.tableWrap}><table className={s.table}><caption>{category} · top {rows.length} of {total ?? rows.length} missions</caption>
                <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Mode</th><th scope="col">Result</th><th scope="col">Score</th><th scope="col">Record</th></tr></thead>
                <tbody>{rows.map(row => <tr key={row.id} className={row.id === currentRunId ? s.playerRow : ''}>
                  <td>#{row.rank}</td><th scope="row"><Link className={s.nameLink} href={`/records/${row.id}`}>{row.nickname}</Link>{row.id === currentRunId ? ' · Your run' : ''}</th>
                  <td>{row.mode}</td><td><span className={row.passed ? s.pass : s.fail}>{row.passed ? 'PASS' : 'FAIL'}</span></td><td className={s.score}>{row.score}</td>
                  <td><Link className={s.miniLink} href={`/records/${row.id}`}>Open log →</Link></td></tr>)}</tbody></table></div>}
          </>}
    </div>
  </div>;
}
