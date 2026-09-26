import Link from 'next/link';
import type { MissionReport as ReportData } from '../ai/report';
import type { ScientificSource } from '../ai/schemas';
import type { ReportSnapshot } from '../game/state/reportSnapshot';
import { scientificFraming } from '../content/copy';
import { ScoreRadar } from './ScoreRadar';
import s from './report.module.css';

type Score = Partial<ReportSnapshot['score']> & Pick<ReportSnapshot['score'], 'total'>;
export type MissionReportProps = {
  report: ReportData; nickname: string; scores: Score; sources: readonly ScientificSource[];
  runId?: string; saved?: boolean; pending?: boolean; reason?: string;
  retryable?: boolean; retryBusy?: boolean; onRetry?: () => void;
};

function NarrativeCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className={s.card}><div className={s.cardTop}><span>{number}</span><span>MISSION ANALYSIS</span></div><h3>{title}</h3><p>{text}</p></article>;
}

export function MissionReport({ report, nickname, scores, sources, runId, saved, pending, reason, retryable, retryBusy, onRetry }: MissionReportProps) {
  const citations = sources.filter((source) => report.sourceIds.includes(source.id) && /^https:\/\//.test(source.url));
  const aiLabel = report.fallbackFields?.length ? 'Archived sections extended with rule-based analysis' : report.usedFallback
    ? 'Rule-based analysis · AI narrative unavailable' : 'AI analysis grounded in this mission';
  const scoreStatus = scores.usedFallback ? 'Rules-only score normalized to 100' : 'Rules + strategy evaluation';
  return <main className={s.report}>
    <header className={s.hero}>
      <div className={s.heroGrid} aria-hidden="true" />
      <div className={s.heroCopy}>
        <p className={s.eyebrow}>AGRONAUT / MISSION DOSSIER {runId ? `/ ${runId.slice(0, 8).toUpperCase()}` : '/ PREVIEW'}</p>
        <h1>After the<br /><em>harvest.</em></h1>
        <p className={s.heroIntro}>A scientific reading of your lunar agriculture strategy. From established research to the decisions that shaped this mission.</p>
        <div className={s.heroMeta}><span>OPERATOR&nbsp; {nickname}</span><span>MISSION&nbsp; {report.result}</span><span>{saved ? 'ARCHIVED' : pending ? 'FINALIZING' : 'LOCAL REPORT'}</span></div>
      </div>
      <div className={s.scoreHero} aria-label={`Final mission score ${scores.total} out of 100`}><span className={s.scoreCaption}>FINAL ASSESSMENT</span><strong>{scores.total.toFixed(1)}</strong><span className={s.scoreDenominator}>/ 100 POINTS</span><span className={report.result === 'PASS' ? s.pass : s.fail}>{report.result}</span></div>
    </header>
    <div className={s.reportBody}>
      {(pending || !saved || report.usedFallback || scores.usedFallback) && <aside className={s.status} role="status">
        <span className={s.statusSignal} aria-hidden="true" />
        <div><strong>{pending ? 'Final evaluation in progress' : !saved ? 'Report available locally' : 'Evaluation status'}</strong><p>{pending ? 'Your current mission score is shown now. This page updates when final scoring and the report arrive.' : reason ?? `${scoreStatus}. ${aiLabel}.`}</p></div>
        {retryable && onRetry && <button type="button" onClick={onRetry} disabled={retryBusy}>{retryBusy ? 'Retrying…' : 'Retry submission'}</button>}
      </aside>}
      <section className={s.chapter} aria-labelledby="research-heading"><div className={s.chapterHeading}><span>01 / RESEARCH HORIZON</span><h2 id="research-heading">What we know<br /><em>about growing beyond Earth.</em></h2><p>Space agriculture is an active field of controlled-environment research. This simulation interprets its systems and trade-offs; it does not claim that a complete lunar farm has been demonstrated.</p></div>
        <div className={s.twoCards}><NarrativeCard number="01.1" title="The research landscape" text={report.researchLandscape ?? report.scientificContext} /><NarrativeCard number="01.2" title="Scientific context" text={report.scientificContext} /></div>
        {citations.length > 0 && <div className={s.sourceStrip}><span className={s.eyebrow}>VERIFIED RESEARCH / OPEN THE SOURCE</span><div>{citations.slice(0, 4).map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><small>{source.organization}</small><strong>{source.title}</strong><span>↗</span></a>)}</div></div>}
      </section>
      <section className={s.chapter} aria-labelledby="evaluation-heading"><div className={s.chapterHeading}><span>02 / ASSESSMENT</span><h2 id="evaluation-heading">A score with<br /><em>more than one dimension.</em></h2><p>{report.evaluationSystem ?? 'The transparent simulation rules contribute up to 70 points across production, stability, efficiency, resilience, and budget. Strategy analysis contributes up to 30 points when available.'}</p></div>
        <div className={s.scoreLayout}><div className={s.scoreSummary}><div><span>RULE-BASED PERFORMANCE</span><strong>{scores.rules?.toFixed(1) ?? '—'}<small> / 70</small></strong></div><div><span>STRATEGY ASSESSMENT</span><strong>{scores.usedFallback || scores.llm == null ? '—' : scores.llm.toFixed(1)}<small> / 30</small></strong></div><p>{scoreStatus}. {scores.usedFallback && 'The 30-point strategy component was unavailable, so the rules score was proportionally scaled to 100.'}</p></div><ScoreRadar score={{ total: scores.total, rules: scores.rules ?? 0, llm: scores.llm ?? 0, usedFallback: scores.usedFallback ?? true, breakdown: scores.breakdown }} /></div>
        <div className={s.cardGrid}><NarrativeCard number="02.1" title="Mission overview" text={report.overview} /><NarrativeCard number="02.2" title="Production" text={report.production} /><NarrativeCard number="02.3" title="System stability" text={report.stability} /><NarrativeCard number="02.4" title="Hazard response" text={report.disasterResponse} /><NarrativeCard number="02.5" title="Mission control" text={report.missionControl} /></div>
      </section>
      <section className={s.chapter} aria-labelledby="changes-heading"><div className={s.chapterHeading}><span>03 / NEXT ITERATION</span><h2 id="changes-heading">Change the system.<br /><em>Test the result.</em></h2><p>{report.evidenceBasedChanges ?? report.strategySuggests}</p></div><div className={s.cardGrid}><NarrativeCard number="03.1" title="Layout and delivery" text={report.layout} /><NarrativeCard number="03.2" title="Agricultural choices" text={report.agriculture} /><NarrativeCard number="03.3" title="Strategy to test" text={report.strategySuggests} /></div></section>
      <section className={`${s.chapter} ${s.contribution}`} aria-labelledby="contribution-heading"><div className={s.chapterHeading}><span>04 / YOUR CONTRIBUTION</span><h2 id="contribution-heading">A new question<br /><em>for the frontier.</em></h2></div><div className={s.contributionText}><span aria-hidden="true">“</span><p>{report.contribution ?? report.strategySuggests}</p><small>DESIGN-SPACE OBSERVATION / NOT A SCIENTIFIC VALIDATION</small></div></section>
      <footer className={s.reportFooter}><div><span className={s.eyebrow}>METHOD & LIMITS</span><p>{scientificFraming} Comparisons between player runs are observations within a simplified simulation, not causal findings. {aiLabel}.</p></div>{runId && <nav className={s.actions} aria-label="Report actions"><Link href="/game">New Mission <span>↗</span></Link><Link href="/">Back to Main <span>↗</span></Link></nav>}</footer>
    </div>
  </main>;
}
