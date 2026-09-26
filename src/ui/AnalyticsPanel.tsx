import type { AggregateAnalytics } from '../backend/analytics';
import { EmptyState, Panel } from './primitives';
import s from './ui.module.css';

function Bars({ values, label }: { values: Record<string, number>; label: string }) {
  const entries = Object.entries(values);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return <figure className={s.bars}><figcaption>{label} · count</figcaption>{entries.length
    ? entries.map(([name, value]) => <div key={name} className={s.barRow}><span>{name}</span><div className={s.track}><div className={s.bar} style={{ width: `${Math.max(0, value) / max * 100}%` }} /></div><strong>{value}</strong></div>)
    : <p>No selections recorded.</p>}</figure>;
}

export function AnalyticsPanel({ data, loading, error, onRetry }: { data?: AggregateAnalytics; loading?: boolean; error?: string; onRetry?: () => void }) {
  return <section className={s.root}>
    <p className={s.eyebrow}>Shared field notes</p><h1>What are players growing?</h1>
    <p>Observed among completed player runs. Patterns describe this dataset; they do not establish cause and effect.</p>
    {loading ? <p role="status">Gathering field notes…</p>
      : error ? <EmptyState title="Field notes unavailable" onRetry={onRetry}>{error}</EmptyState>
        : !data?.sampleSize ? <EmptyState title="More missions, more perspective.">No completed runs available yet. Charts will appear when observations arrive.</EmptyState>
          : <>
            <p className={s.badge}>{data.sampleSize} completed runs in this sample</p>
            <div className={s.twoCol}>
              <Panel title="A. Layout Intelligence"><dl className={s.stats}>
                <div><dt>Average corridor length</dt><dd>{data.layout.averageCorridorLength} cells</dd></div>
                <div><dt>Average greenhouse–water distance</dt><dd>{data.layout.averageGreenhouseWaterDistance} grid steps</dd></div>
                <div><dt>Average greenhouse–utility distance</dt><dd>{data.layout.averageGreenhouseUtilityDistance ?? 0} grid steps</dd></div>
                <div><dt>Average occupied map share</dt><dd>{((data.layout.averageModuleDensity ?? 0) * 100).toFixed(0)}%</dd></div>
                <div><dt>Average compact greenhouse share</dt><dd>{(data.layout.compactGreenhouseShare * 100).toFixed(0)}%</dd></div>
                <div><dt>Average connected module share</dt><dd>{(data.layout.averageConnectedModuleShare * 100).toFixed(0)}%</dd></div>
                <div><dt>Average resilience budget share</dt><dd>{(data.layout.averageResilienceBudgetShare * 100).toFixed(0)}%</dd></div>
              </dl><p className={s.muted}>Distances reflect the recorded grid layout, not measured water delivery.</p></Panel>
              <Panel title="B. Agricultural Patterns"><dl className={s.metrics}>
                <div><dt>Average crop production</dt><dd>{data.agriculture.averageCropYield}</dd></div>
                <div><dt>Average meat production</dt><dd>{data.agriculture.averageMeatYield}</dd></div>
                <div><dt>Average crop yield per greenhouse</dt><dd>{data.agriculture.averageCropYieldPerGreenhouse}</dd></div>
                <div><dt>Average efficiency score</dt><dd>{data.agriculture.averageEfficiencyScore ?? 0}</dd></div>
              </dl>
                <Bars values={data.agriculture.cropMix} label="Final slot crop mix" />
                <Bars values={data.agriculture.livestockMix} label="Final stall livestock mix" />
                <Bars values={data.agriculture.cropWaterSettings} label="Final crop water settings" />
                <Bars values={data.agriculture.cropLightSettings} label="Final crop light settings" />
                <Bars values={data.agriculture.cropTemperatureSettings} label="Final crop temperature settings" />
              </Panel>
            </div>
            {data.decisions && <Panel title="C. Decisions during the mission"><p>{data.decisions.sampleSize} replayable runs among the latest 200 saved runs. Counts reflect accepted actions, not final slot choices.</p><dl className={s.stats}>
              <div><dt>Crop switches</dt><dd>{data.decisions.cropSwitches}</dd></div>
              <div><dt>Parameter changes</dt><dd>{data.decisions.parameterChanges}</dd></div>
              <div><dt>High light selections</dt><dd>{data.decisions.highLightSelections}</dd></div>
              <div><dt>Low water selections</dt><dd>{data.decisions.lowWaterSelections}</dd></div>
              <div><dt>Planting or parameter changes in turns 1–5</dt><dd>{data.decisions.earlyChanges}</dd></div>
              <div><dt>Planting or parameter changes in turns 6–10</dt><dd>{data.decisions.lateChanges}</dd></div>
            </dl><Bars values={data.decisions.plantedByCrop} label="Crops planted during play" /><Bars values={data.decisions.harvestedByCrop} label="Harvest actions by crop" />
            <p className={s.muted}>A harvest action is counted even when its edible yield is zero, for example a research crop. Progressive levels restart the 1–10 turn window.</p></Panel>}
            {data.pressure && <Panel title="D. Resource pressure and layout"><p>{data.pressure.sampleSize} runs with turn records among the latest 200 saved runs. A pressure turn ends with water or power below 25 game units.</p><dl className={s.stats}>
              <div><dt>Crop yield per pressure turn</dt><dd>{data.pressure.averageCropYieldUnderPressure} · {data.pressure.pressureTurns} turns</dd></div>
              <div><dt>Crop yield per other turn</dt><dd>{data.pressure.averageCropYieldWithoutPressure} · {data.pressure.ordinaryTurns} turns</dd></div>
              <div><dt>Greenhouse within 3 grid steps of water</dt><dd>{data.pressure.nearWater.averageCropYieldPerPressureTurn} · {data.pressure.nearWater.runs} runs</dd></div>
              <div><dt>Greenhouse farther than 3 steps</dt><dd>{data.pressure.farFromWater.averageCropYieldPerPressureTurn} · {data.pressure.farFromWater.runs} runs</dd></div>
            </dl><p className={s.muted}>Layout groups include only runs with a greenhouse, water module and at least one pressure turn. Distances use the final layout; they do not measure delivered water.</p></Panel>}
            {data.tradeoff && <Panel title="E. Production and resilience trade-off"><p>Groups are split by protective module budget share: at least {(data.tradeoff.threshold * 100).toFixed(0)}% versus below. Scores are descriptive means.</p><dl className={s.stats}>
              <div><dt>Higher protective share</dt><dd>{data.tradeoff.higherResilience.runs} runs · production {data.tradeoff.higherResilience.averageProductionScore} · resilience {data.tradeoff.higherResilience.averageResilienceScore}</dd></div>
              <div><dt>Lower protective share</dt><dd>{data.tradeoff.lowerResilience.runs} runs · production {data.tradeoff.lowerResilience.averageProductionScore} · resilience {data.tradeoff.lowerResilience.averageResilienceScore}</dd></div>
            </dl><p className={s.muted}>Players select their own layouts and strategies. Mode, skill and other differences may explain group differences; these observations do not establish causality.</p></Panel>}
            {data.highPerforming.sampleSize > 0 && <Panel title="Top quartile observations"><p>{data.highPerforming.sampleSize} highest-scoring runs in this sample.</p><dl className={s.stats}>
              <div><dt>Average corridor length</dt><dd>{data.highPerforming.averageCorridorLength} cells</dd></div>
              <div><dt>Average resilience budget share</dt><dd>{(data.highPerforming.averageResilienceBudgetShare * 100).toFixed(0)}%</dd></div>
              <div><dt>Average crop yield per greenhouse</dt><dd>{data.highPerforming.averageCropYieldPerGreenhouse}</dd></div>
            </dl><p className={s.muted}>These are descriptive associations; they do not show that a layout causes a higher score.</p></Panel>}
          </>}
  </section>;
}
