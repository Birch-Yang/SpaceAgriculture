import { AppFrame } from '../../src/ui/integration/AppFrame';
import { AnalyticsPanel } from '../../src/ui/AnalyticsPanel';
import { getAggregateAnalytics } from '../../src/backend/analytics';
export const dynamic = 'force-dynamic';
export default async function AnalyticsPage() {
  try { const data = await getAggregateAnalytics(); return <AppFrame><AnalyticsPanel data={data} /></AppFrame>; }
  catch { return <AppFrame><AnalyticsPanel error="Player observations are temporarily unavailable. Please reload to retry." /></AppFrame>; }
}
