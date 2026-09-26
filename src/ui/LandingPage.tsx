'use client';
import { useState, type FormEvent } from 'react';
import type { GameMode } from '../game/state/types';
import { PixelAsset } from './primitives';
import s from './ui.module.css';
export type LandingPageProps = { onStart: (nickname: string, mode: GameMode) => void; pending?: boolean; error?: string };
export function LandingPage({ onStart, pending = false, error }: LandingPageProps) {
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<GameMode>('progressive');
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (nickname.trim() && !pending) onStart(nickname.trim(), mode); }
  return <div className={`${s.root} ${s.landing}`}><nav className={s.nav} aria-label="Main"><a href="/" className={s.wordmark}>◈ LUNAR AGRICULTURE</a><div><a href="/leaderboard">Mission records</a><a href="/analytics">Player patterns</a></div></nav>
    <div className={s.hero}><div><p className={s.eyebrow}>Lunar south pole / design-space explorer</p><h1>Small outpost.<br /><span>Extraordinary stakes.</span></h1><p className={s.pitch}>Design a lunar farm, balance its life-support systems, and discover what it takes to keep growing.</p><ol className={s.steps}>{['Design', 'Farm', 'Survive', 'Learn'].map((step, i) => <li key={step}><span>0{i + 1}</span>{step}</li>)}</ol>
    <form onSubmit={submit} className={s.launch}><label htmlFor="nickname">Your mission nickname</label><input id="nickname" name="nickname" autoComplete="off" maxLength={32} required value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. MoonGardener" aria-describedby="nickname-help" /><p id="nickname-help" className={s.muted}>Shown on public mission records. Choose a nickname, not your real name.</p><div className={s.twoCol}><button type="submit" className={s.button} disabled={pending || !nickname.trim()} onClick={() => setMode('challenge')}>Challenge Mode <small>10 turns · high pressure</small></button><button type="submit" className={`${s.button} ${s.primary}`} disabled={pending || !nickname.trim()} onClick={() => setMode('progressive')}>Progressive Mode <small>3 levels · learn as you grow</small></button></div>{pending && <p role="status">Preparing your mission…</p>}{error && <p role="alert" className={s.error}>{error}</p>}</form></div>
    <figure className={s.outpost}><div className={s.earth} /><p className={s.sector}>SECTOR 01 / SOUTH POLE</p><div className={s.moonBase}>{['solar','communications','greenhouse','habitat','water','livestock','utility','shelter','battery'].map(name => <PixelAsset key={name} name={name} size={104} />)}</div><figcaption><span className={s.light} /> One outpost. Many connected decisions.</figcaption></figure></div>
    <footer className={s.footer}><p>Every harvest depends on the systems keeping it alive.</p><p>Educational simulation · Desktop experience · No account needed</p></footer></div>;
}
