import { AppFrame } from '../../../src/ui/integration/AppFrame';
import { ReportScreen } from '../../../src/ui/integration/ReportScreen';
export default async function ReportPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <AppFrame><ReportScreen runId={runId} /></AppFrame>;
}
