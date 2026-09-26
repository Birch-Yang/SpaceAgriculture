'use client';
import { useState, type ReactNode } from 'react';
import s from './ui.module.css';
export type Severity = 'normal' | 'warning' | 'critical';
export function Panel({ title, eyebrow, children, className = '' }: { title: string; eyebrow?: string; children: ReactNode; className?: string }) {
  return <section className={`${s.panel} ${className}`}><header>{eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}<h2>{title}</h2></header>{children}</section>;
}
export function PixelAsset({ name, folder = 'modules', label, size = 48 }: { name: string; folder?: 'modules' | 'crops' | 'animals' | 'ui'; label?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className={s.assetFallback} role={label ? 'img' : undefined} aria-label={label} aria-hidden={!label} style={{ width: size, height: size }}>◇</span> : <img className={s.pixel} src={`/assets/${folder}/${name}.svg`} width={size} height={size} alt={label ?? ''} onError={() => setFailed(true)} />;
}
export function Status({ severity, children }: { severity?: Severity; children?: ReactNode }) {
  return <span className={`${s.badge} ${severity ? s[severity] : ''}`}>{children ?? severity ?? 'Status unavailable'}</span>;
}
export function EmptyState({ title, children, onRetry }: { title: string; children: ReactNode; onRetry?: () => void }) {
  return <div className={s.empty} role="status"><h3>{title}</h3><p>{children}</p>{onRetry && <button className={s.button} onClick={onRetry}>Try again</button>}</div>;
}
