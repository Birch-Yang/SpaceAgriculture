'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createInitialState } from '../../game/state/reducer';
import type { GameMode, GameState } from '../../game/state/types';
import type { ReplayFrame } from '../../game/state/replayFrames';
import type { JournalEntry, TimelineEntry } from '../../game/state/runHistory';
import { ReplayBaseMap } from './ReplayBaseMap';
import s from './archive.module.css';

export function RecordExperience({ runId, nickname, mode, rulesetVersion, passed, score, frames, journal, timeline, layoutAssessment, layoutMetrics }: {
  runId: string; nickname: string; mode: GameMode; rulesetVersion: 1 | 2 | 3; passed: boolean; score: number;
  frames: ReplayFrame[]; journal: JournalEntry[]; timeline: TimelineEntry[];
  layoutAssessment: string; layoutMetrics: Record<string, number>;
}) {
  const [frameIndex, setFrameIndex] = useState(frames.length - 1);
  const frame = frames[frameIndex];
  const state = useMemo((): GameState => ({ ...createInitialState(runId, nickname, mode, rulesetVersion),
    phase: frame.phase, level: frame.level, turn: frame.turn, budget: frame.budget,
    resources: frame.resources, production: frame.production, modules: frame.modules,
    utilityEdges: frame.utilityEdges, crops: frame.crops, livestock: frame.livestock,
    activeHazard: frame.hazard, crisis: frame.crisis,
  }), [runId, nickname, mode, rulesetVersion, frame]);
  const selectedStep = journal.find(item => item.frameIndex === frameIndex);
  return <div className={s.page}>
    <header className={s.hero}><div className={s.heroInner}><p className={s.eyebrow}>Mission archive / player record</p>
      <h1>{nickname}&apos;s outpost.</h1><p>Follow each accepted command and incident, then inspect the base as it looked at that point in the mission.</p>
    </div></header>
    <div className={s.body}>
      <div className={s.summaryStrip}><span><strong>{Number.isFinite(score) ? score : '—'}</strong> overall score</span>
        <span><strong className={passed ? s.pass : s.fail}>{passed ? 'PASS' : 'FAIL'}</strong> mission result</span>
        <span><strong>{frames.filter(item => item.kind === 'turn').length}</strong> played turns</span><span>{mode} mode</span></div>
      <div className={s.tabs}><Link className={s.actionLink} href="/leaderboard">← All records</Link>
        <Link className={s.actionLink} href={`/report/${runId}`}>View full report</Link></div>
      <section className={`${s.card} ${s.layoutAnalysis}`} aria-labelledby="layout-analysis-heading">
        <p className={s.kicker}>Base design / strengths and weaknesses</p><h2 id="layout-analysis-heading">Layout Analysis</h2>
        <dl className={s.layoutMetrics}>
          <div><dt>Habitat connection</dt><dd>{Math.round((layoutMetrics.connectedModuleShare ?? 0) * 100)}%</dd></div>
          <div><dt>Corridor length</dt><dd>{layoutMetrics.corridorLength ?? 0} cells</dd></div>
          <div><dt>Greenhouse → water</dt><dd>{(layoutMetrics.greenhouseCount ?? 0) && (layoutMetrics.waterModuleCount ?? 0)
            ? `${layoutMetrics.averageGreenhouseWaterDistance ?? 0} steps` : '—'}</dd></div>
          <div><dt>Protective budget share</dt><dd>{Math.round((layoutMetrics.resilienceBudgetShare ?? 0) * 100)}%</dd></div>
        </dl>
        {layoutAssessment.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <p className={s.cardNote}>Distances are geometric. Follow the replay to inspect actual connections and turn results.</p>
      </section>
      <div className={s.detailGrid}>
        <div><section className={s.mapPanel} aria-label="Saved lunar base layout"><div className={s.mapCaption}>
          <span>BASE LAYOUT / {frame.phase.toUpperCase()}</span><span>Level {frame.level} · turn {frame.turn}</span></div>
          <div className={s.mapStage}><ReplayBaseMap state={state} /></div>
          <div className={s.mapControls}><button type="button" className={s.control} disabled={frameIndex === 0} onClick={() => setFrameIndex(value => value - 1)}>← Previous</button>
            <input type="range" min={0} max={frames.length - 1} value={frameIndex} onChange={event => setFrameIndex(Number(event.target.value))}
              aria-label="Mission replay step" /><span>{frameIndex} / {frames.length - 1}</span>
            <button type="button" className={s.control} disabled={frameIndex === frames.length - 1} onClick={() => setFrameIndex(value => value + 1)}>Next →</button></div>
        </section>
          <section className={s.card} style={{ marginTop: 20 }}><p className={s.kicker}>Selected moment</p><h2>{selectedStep?.label ?? 'Initial design'}</h2>
            <p>{selectedStep?.actions.join(' · ') ?? 'The mission begins before construction.'}</p>
            {selectedStep?.hazard && <p className={s.fail}>Incident: {selectedStep.hazard}</p>}
            {selectedStep?.crisis && <p className={s.fail}>{selectedStep.crisis}</p>}
            <dl className={s.sideStats}><div><dt>Power</dt><dd>{frame.resources.power}</dd></div><div><dt>Water</dt><dd>{frame.resources.water}</dd></div>
              <div><dt>Oxygen</dt><dd>{frame.resources.oxygen}</dd></div><div><dt>Food</dt><dd>{frame.resources.food}</dd></div>
              <div><dt>Crop yield</dt><dd>{frame.production.cropCumulative}</dd></div><div><dt>Meat yield</dt><dd>{frame.production.meatCumulative}</dd></div></dl>
          </section></div>
        <div><section className={s.card}><p className={s.kicker}>Accepted player commands</p><h2>Operation log</h2>
          <p className={s.cardNote}>Select an entry to show the base immediately after that step. Minigame input proofs are omitted from the readable log.</p>
          <div className={s.log}>{journal.map(entry => <button key={entry.frameIndex} type="button" className={s.logButton}
            aria-current={frameIndex === entry.frameIndex} onClick={() => setFrameIndex(entry.frameIndex)}>
            <strong>{String(entry.frameIndex).padStart(2, '0')} / {entry.label}</strong><span>{entry.actions.join(' · ')}</span>
            {entry.hazard && <span className={s.fail}>⚠ {entry.hazard}</span>}{entry.crisis && <span className={s.fail}>{entry.crisis}</span>}
          </button>)}</div></section>
          <section className={s.card} style={{ marginTop: 20 }}><p className={s.kicker}>Unexpected events</p><h2>Incident timeline</h2>
            {timeline.length ? <ol className={s.timeline}>{timeline.map((event, index) => <li key={`${event.frameIndex}-${event.kind}-${index}`}>
              <button type="button" className={s.logButton} onClick={() => setFrameIndex(event.frameIndex)}>
                <strong>Level {event.level} · turn {event.turn} / {event.label}</strong><span>{event.detail}</span>
              </button></li>)}</ol> : <p className={s.cardNote}>No major hazard or crisis was recorded in this mission.</p>}
          </section></div>
      </div>
    </div>
  </div>;
}
