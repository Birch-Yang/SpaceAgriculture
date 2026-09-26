export default async function ReportPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <main><p className="eyebrow">Mission report</p><h1>Run {runId}</h1><p>The report becomes available after a completed run has been evaluated.</p></main>;
}
