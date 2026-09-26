import { AppFrame } from '../../src/ui/integration/AppFrame';
import { AnalyticsPanel } from '../../src/ui/AnalyticsPanel';
import { getAggregateAnalytics } from '../../src/backend/analytics';
export const dynamic = 'force-dynamic';
export default async function AnalyticsPage() {
  try { const data = await getAggregateAnalytics(); return <AppFrame><AnalyticsPanel data={data} /></AppFrame>; }
  catch (error) { return <AppFrame><AnalyticsPanel error={error instanceof Error && error.message.startsWith('Player patterns need Supabase')
    ? 'Player patterns need Supabase project URL and publishable key. See the setup guide.'
    : 'Player observations are temporarily unavailable. Please reload to retry.'} /></AppFrame>; }
}
