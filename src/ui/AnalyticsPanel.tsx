import type { AggregateAnalytics } from '../backend/analytics';
import type { PatternNarrative, PatternSection } from '../backend/patternNarrative';
import { verifiedSources } from '../ai/sourceAdapter';
import s from './integration/archive.module.css';

function Bars({ values, label }: { values: Record<string, number>; label: string }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return <figure className={s.bars}><figcaption>{label} · count</figcaption>{entries.length
    ? entries.map(([name, value]) => <div key={name} className={s.barRow}><span>{name}</span><div className={s.track}><div className={s.bar} style={{ width: `${Math.max(0, value) / max * 100}%` }} /></div><strong>{value}</strong></div>)
    : <p className={s.cardNote}>No selections recorded.</p>}</figure>;
}

function Stats({ items }: { items: Array<[string, string | number]> }) {
  return <dl className={s.stats}>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function Reading({ section, narrative }: { section: PatternSection; narrative: PatternNarrative }) {
  return <aside className={s.insight}><strong>{narrative.usedFallback ? 'Data reading · AI unavailable or refreshing' : 'AI interpretation · research context'}</strong>
    <p>{narrative.sections[section]}</p></aside>;
}

export function AnalyticsPanel({ data, narrative, loading, error, onRetry }: {
  data?: AggregateAnalytics; narrative?: PatternNarrative; loading?: boolean; error?: string; onRetry?: () => void;
}) {
  return <div className={s.page}>
    <header className={s.hero}><div className={s.heroInner}><p className={s.eyebrow}>Shared field notes / player patterns</p>
      <h1>What are players growing?</h1><p>Explore the choices behind completed missions. Each reading separates what this game recorded from what space agriculture research can support.</p>
    </div></header>
    <div className={s.body}>
      {loading ? <div className={s.empty} role="status">Gathering field notes…</div>
        : error ? <div className={s.empty} role="alert"><h2>Field notes unavailable</h2><p>{error}</p>{onRetry && <button className={s.control} onClick={onRetry}>Try again</button>}</div>
          : !data?.sampleSize || !narrative ? <div className={s.empty}><h2>More missions, more perspective.</h2><p>No completed runs available yet. Charts will appear when observations arrive.</p></div>
            : <>
              <div className={s.summaryStrip}><span><strong>{data.sampleSize}</strong> completed runs</span>
                <span><strong>{data.outcomes.passed.runs}</strong> passed</span><span><strong>{data.outcomes.failed.runs}</strong> failed</span>
                <span><strong>{data.decisions?.sampleSize ?? 0}</strong> replayable histories</span></div>
              {data.automatedSampleSize > 0 && <p className={s.notice}><strong>Sample context:</strong> {data.automatedSampleSize} of these missions are automated demonstration runs. Interpret player behavior cautiously until more independent players participate.</p>}
              <p className={s.cardNote}>This is a self-selected game sample, not a controlled lunar agriculture experiment. AI readings refresh at most hourly; when the dataset changes, the page shows a current data reading until the next refresh.</p>
              <div className={s.cardGrid}>
                <section className={`${s.card} ${s.full}`}><p className={s.kicker}>01 / mission outcomes</p><h2>What do successful runs have in common?</h2>
                  <Stats items={[
                    ['Passed / failed', `${data.outcomes.passed.runs} / ${data.outcomes.failed.runs}`],
                    ['Connected modules · passed', `${Math.round(data.outcomes.passed.averageConnectedModuleShare * 100)}%`],
                    ['Connected modules · failed', `${Math.round(data.outcomes.failed.averageConnectedModuleShare * 100)}%`],
                    ['Crop yield · passed / failed', `${data.outcomes.passed.averageCropYield} / ${data.outcomes.failed.averageCropYield}`],
                    ['Stability · passed / failed', `${data.outcomes.passed.averageStabilityScore} / ${data.outcomes.failed.averageStabilityScore}`],
                  ]} />
                  <Bars values={data.outcomes.passed.finalCropMix} label="Final crops in passed missions" />
                  <Bars values={data.outcomes.failed.finalCropMix} label="Final crops in failed missions" />
                  <Reading section="outcomes" narrative={narrative} />
                </section>
                <section className={s.card}><p className={s.kicker}>02 / spatial design</p><h2>Layout intelligence</h2>
                  <Stats items={[
                    ['Corridor length', `${data.layout.averageCorridorLength} cells`],
                    ['Greenhouse to water', `${data.layout.averageGreenhouseWaterDistance} steps`],
                    ['Greenhouse to utility', `${data.layout.averageGreenhouseUtilityDistance ?? 0} steps`],
                    ['Connected modules', `${Math.round(data.layout.averageConnectedModuleShare * 100)}%`],
                    ['Protective budget share', `${Math.round(data.layout.averageResilienceBudgetShare * 100)}%`],
                  ]} /><p className={s.cardNote}>Grid distance is not measured resource delivery.</p><Reading section="layout" narrative={narrative} /></section>
                <section className={s.card}><p className={s.kicker}>03 / crops and livestock</p><h2>Agricultural patterns</h2>
                  <Stats items={[
                    ['Crop yield / run', data.agriculture.averageCropYield], ['Meat yield / run', data.agriculture.averageMeatYield],
                    ['Crop yield / greenhouse', data.agriculture.averageCropYieldPerGreenhouse],
                    ['Efficiency score', data.agriculture.averageEfficiencyScore ?? 0],
                  ]} />
                  <Bars values={data.agriculture.cropMix} label="Final crop slots" /><Bars values={data.agriculture.livestockMix} label="Final livestock stalls" />
                  <Bars values={data.agriculture.cropWaterSettings} label="Final water settings" /><Bars values={data.agriculture.cropLightSettings} label="Final light settings" />
                  <Bars values={data.agriculture.cropTemperatureSettings} label="Final temperature settings" />
                  <Reading section="agriculture" narrative={narrative} /></section>
                <section className={s.card}><p className={s.kicker}>03A / production outcomes</p><h2>Output Analysis</h2>
                  <Stats items={[
                    ['Edible crop yield / run', data.agriculture.averageCropYield],
                    ['Meat yield / run', data.agriculture.averageMeatYield],
                    ['Crop yield / final greenhouse', data.agriculture.averageCropYieldPerGreenhouse],
                    ['Average efficiency score', `${data.agriculture.averageEfficiencyScore ?? 0} / 8`],
                    ['Crop yield · passed / failed', `${data.outcomes.passed.averageCropYield} / ${data.outcomes.failed.averageCropYield}`],
                  ]} />
                  <p className={s.cardNote}>Research samples are separate from edible output. Group averages mix mission modes and conditions.</p>
                  <Reading section="output" narrative={narrative} /></section>
                {data.decisions && <section className={s.card}><p className={s.kicker}>04 / action history</p><h2>Decisions during play</h2>
                  <p className={s.cardNote}>{data.decisions.sampleSize} replayable runs. Counts are accepted actions, not distinct players or final slot choices.</p>
                  <Stats items={[
                    ['Crop switches', data.decisions.cropSwitches], ['Parameter changes', data.decisions.parameterChanges],
                    ['High light selections', data.decisions.highLightSelections], ['Low water selections', data.decisions.lowWaterSelections],
                    ['Early changes · turns 1–5', data.decisions.earlyChanges], ['Late changes · turns 6–10', data.decisions.lateChanges],
                  ]} /><Bars values={data.decisions.plantedByCrop} label="Planting actions" /><Bars values={data.decisions.harvestedByCrop} label="Harvest actions" />
                  <p className={s.cardNote}>Research crops can have zero edible yield. Progressive levels restart the 1–10 turn window.</p>
                  <Reading section="decisions" narrative={narrative} /></section>}
                {data.pressure && <section className={s.card}><p className={s.kicker}>05 / resource margins</p><h2>Pressure and layout</h2>
                  <p className={s.cardNote}>Pressure means a turn ended with water or power below 25 game units.</p>
                  <Stats items={[
                    ['Pressure / other turns', `${data.pressure.pressureTurns} / ${data.pressure.ordinaryTurns}`],
                    ['Crop yield / pressure turn', data.pressure.averageCropYieldUnderPressure],
                    ['Crop yield / other turn', data.pressure.averageCropYieldWithoutPressure],
                    ['Within 3 steps · runs', data.pressure.nearWater.runs], ['Farther away · runs', data.pressure.farFromWater.runs],
                  ]} /><Reading section="pressure" narrative={narrative} /></section>}
                {data.tradeoff && <section className={s.card}><p className={s.kicker}>06 / design trade-off</p><h2>Production and resilience</h2>
                  <p className={s.cardNote}>Groups use a game-specific {(data.tradeoff.threshold * 100).toFixed(0)}% protective-module budget threshold.</p>
                  <Stats items={[
                    ['Higher / lower share · runs', `${data.tradeoff.higherResilience.runs} / ${data.tradeoff.lowerResilience.runs}`],
                    ['Production · higher / lower', `${data.tradeoff.higherResilience.averageProductionScore} / ${data.tradeoff.lowerResilience.averageProductionScore}`],
                    ['Resilience · higher / lower', `${data.tradeoff.higherResilience.averageResilienceScore} / ${data.tradeoff.lowerResilience.averageResilienceScore}`],
                  ]} /><Reading section="tradeoff" narrative={narrative} /></section>}
                <section className={s.card}><p className={s.kicker}>07 / leading scores</p><h2>Top quartile observations</h2>
                  <p className={s.cardNote}>The {data.highPerforming.sampleSize} highest total scores can include failed missions.</p>
                  <Stats items={[
                    ['Corridor length', `${data.highPerforming.averageCorridorLength} cells`],
                    ['Protective budget share', `${Math.round(data.highPerforming.averageResilienceBudgetShare * 100)}%`],
                    ['Crop yield / greenhouse', data.highPerforming.averageCropYieldPerGreenhouse],
                  ]} /><Reading section="highPerforming" narrative={narrative} /></section>
              </div>
              {narrative.sourceIds.length > 0 && <section className={s.card} style={{ marginTop: 20 }}><p className={s.kicker}>Research context</p><h2>Sources used for context</h2>
                <p className={s.cardNote}>These sources describe research questions, not validation of game scores or lunar production yields.</p>
                <ul className={s.sourceList}>{verifiedSources.filter(source => narrative.sourceIds.includes(source.id)).map(source =>
                  <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.organization} · {source.title}</a></li>)}</ul></section>}
            </>}
    </div>
  </div>;
}
