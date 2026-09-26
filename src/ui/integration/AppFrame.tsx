import type { ReactNode } from 'react';
import Link from 'next/link';
import s from './integration.module.css';
export function AppFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={s.frame}><nav className={s.nav} aria-label="Main navigation"><Link href="/">◈ agronaut</Link><div><Link href="/game">Mission</Link><Link href="/leaderboard">Records</Link><Link href="/analytics">Player patterns</Link></div></nav><div className={wide ? s.wide : s.content}>{children}</div></div>;
}
