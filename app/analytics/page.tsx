import { AppFrame } from '../../src/ui/integration/AppFrame';
import { AnalyticsPanel } from '../../src/ui/AnalyticsPanel';
import { getAggregateAnalytics } from '../../src/backend/analytics';
import { getCachedPatternInterpretations } from '../../src/backend/patternInterpretations';
import { fallbackPatternNarrative, patternFingerprint } from '../../src/backend/patternNarrative';
import { verifiedSources } from '../../src/ai/sourceAdapter';
export const dynamic = 'force-dynamic';
export default async function AnalyticsPage() {
  try {
    const data = await getAggregateAnalytics();
    const cached = data.sampleSize ? await getCachedPatternInterpretations().catch(() => undefined) : undefined;
    const narrative = cached?.fingerprint === patternFingerprint(data) ? cached
      : fallbackPatternNarrative(data, verifiedSources.slice(0, 3).map(source => source.id));
    return <AppFrame wide><AnalyticsPanel data={data} narrative={narrative} /></AppFrame>;
  }
  catch (error) { return <AppFrame wide><AnalyticsPanel error={error instanceof Error && error.message.startsWith('Player patterns need Supabase')
    ? 'Player patterns need Supabase project URL and publishable key. See the setup guide.'
    : 'Player observations are temporarily unavailable. Please reload to retry.'} /></AppFrame>; }
}
