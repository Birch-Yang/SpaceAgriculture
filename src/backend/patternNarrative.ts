import { createHash } from "node:crypto";
import type { AggregateAnalytics } from "./analytics.ts";

export const patternSections = ["outcomes", "layout", "agriculture", "output", "decisions", "pressure", "tradeoff", "highPerforming"] as const;
export type PatternSection = typeof patternSections[number];
export type PatternNarrative = { sampleSize: number; fingerprint: string; sections: Record<PatternSection, string>;
  sourceIds: string[]; usedFallback: boolean };

export function patternFingerprint(data: AggregateAnalytics): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

const dominant = (counts: Record<string, number>) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
const evidenceLimit = (data: AggregateAnalytics) => `${data.sampleSize} saved runs include ${data.automatedSampleSize} automated demonstration runs. The sample is self-selected, and these associations cannot establish causation or real lunar performance.`;

export function fallbackPatternNarrative(data: AggregateAnalytics, sourceIds: string[] = []): PatternNarrative {
  const topCrop = dominant(data.agriculture.cropMix);
  const planted = dominant(data.decisions?.plantedByCrop ?? {});
  const passedCrop = dominant(data.outcomes.passed.finalCropMix);
  const failedCrop = dominant(data.outcomes.failed.finalCropMix);
  const caveat = evidenceLimit(data);
  return { sampleSize: data.sampleSize, fingerprint: patternFingerprint(data), sourceIds, usedFallback: true,
    sections: {
      outcomes: `${data.outcomes.passed.runs} missions passed and ${data.outcomes.failed.runs} did not. Passing runs averaged ${data.outcomes.passed.averageConnectedModuleShare * 100}% connected modules, ${data.outcomes.passed.averageCropYield} crop units, and ${data.outcomes.passed.averageStabilityScore} stability points; failed runs averaged ${data.outcomes.failed.averageConnectedModuleShare * 100}%, ${data.outcomes.failed.averageCropYield}, and ${data.outcomes.failed.averageStabilityScore}. The most common final crop in passing runs was ${passedCrop?.[0] ?? "unrecorded"}; in failed runs it was ${failedCrop?.[0] ?? "unrecorded"}. These are descriptive comparisons across different modes, hazards and layouts, so they do not identify a winning cause. ${caveat}`,
      layout: `The average recorded corridor used ${data.layout.averageCorridorLength} cells and ${Math.round(data.layout.averageConnectedModuleShare * 100)}% of modules were connected to a habitat. Greenhouses sat an average of ${data.layout.averageGreenhouseWaterDistance} grid steps from water modules. Distance is geometric, while actual delivery also depends on connections, flow capacity and turn conditions. A useful experiment would hold crop choice and mission mode fixed while changing one route, then compare turn-level resource margins and output. ${caveat}`,
      agriculture: `${topCrop ? `${topCrop[0]} occupied ${topCrop[1]} final crop slots,` : "No final crop choice was recorded,"} and average edible crop yield was ${data.agriculture.averageCropYield} units per run. Final slots cannot reveal every crop grown earlier, so planting and harvest logs should be considered alongside these counts. Orbital plant studies motivate testing water, light and environmental control together; these simulated frequencies do not demonstrate crop suitability on the Moon. Compare repeated runs with similar infrastructure before interpreting a species difference. ${caveat}`,
      output: `Across the recorded missions, edible crop output averaged ${data.agriculture.averageCropYield} units per run and meat output averaged ${data.agriculture.averageMeatYield}. Crop output per final greenhouse was ${data.agriculture.averageCropYieldPerGreenhouse}, and the average efficiency score was ${data.agriculture.averageEfficiencyScore ?? 0} of 8. Passing missions averaged ${data.outcomes.passed.averageCropYield} crop units compared with ${data.outcomes.failed.averageCropYield} in failed missions. These figures help describe output, but they do not show which specific crop or layout caused a result: mission modes, hazard exposure, input demand and run length can differ. Research samples are separate from edible production. Compare repeated runs of the same mode with similar bases, then change one crop or utility route and inspect turn-level yield together with water and power reserves. ${caveat}`,
      decisions: `${data.decisions?.sampleSize ?? 0} replayable runs contributed action histories. ${planted ? `${planted[0]} was planted ${planted[1]} times,` : "No planting action was recorded,"} with ${data.decisions?.parameterChanges ?? 0} parameter changes and ${data.decisions?.cropSwitches ?? 0} crop switches overall. A frequent choice can reflect availability, defaults, player preference, or a response to trouble. Compare when actions occurred and the resulting resource and harvest records before framing a strategy hypothesis. Action counts are events, not the number of distinct players. ${caveat}`,
      pressure: `${data.pressure?.pressureTurns ?? 0} turns ended with water or power below the defined 25-unit threshold, compared with ${data.pressure?.ordinaryTurns ?? 0} other turns. Observed crop yield per turn was ${data.pressure?.averageCropYieldUnderPressure ?? 0} under pressure and ${data.pressure?.averageCropYieldWithoutPressure ?? 0} otherwise. These groups may differ in mode, stage, crop mix and hazard exposure. A route distance alone does not measure delivered water. Repeat a comparable layout under matched conditions before attributing yield differences to resource pressure. ${caveat}`,
      tradeoff: `${data.tradeoff?.higherResilience.runs ?? 0} runs allocated at least ${Math.round((data.tradeoff?.threshold ?? 0.2) * 100)}% of module cost to protection, versus ${data.tradeoff?.lowerResilience.runs ?? 0} below that threshold. Their average production scores were ${data.tradeoff?.higherResilience.averageProductionScore ?? 0} and ${data.tradeoff?.lowerResilience.averageProductionScore ?? 0}; resilience scores were ${data.tradeoff?.higherResilience.averageResilienceScore ?? 0} and ${data.tradeoff?.lowerResilience.averageResilienceScore ?? 0}. The threshold is a game-analysis grouping, not a scientific optimum. Differences may reflect layout, mission mode and hazard exposure. ${caveat}`,
      highPerforming: `The top quartile contains ${data.highPerforming.sampleSize} runs by total score, regardless of whether their mission passed. Their average corridor length was ${data.highPerforming.averageCorridorLength} cells, protective budget share was ${Math.round(data.highPerforming.averageResilienceBudgetShare * 100)}%, and crop yield per greenhouse was ${data.highPerforming.averageCropYieldPerGreenhouse}. This describes a selected high-scoring group; it should be compared with the full sample and with pass/fail outcomes. Score components partly reward production and stability, so common features may reflect the scoring design rather than a general principle. ${caveat}`,
    } };
}

export function validatePatternNarrative(value: unknown, data: AggregateAnalytics, allowedSourceIds: readonly string[]): PatternNarrative | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  if (patternSections.some((section) => typeof item[section] !== "string"
    || (item[section] as string).trim().split(/\s+/).length < 45)) return undefined;
  const allowed = new Set(allowedSourceIds);
  const sourceIds = Array.isArray(item.sourceIds)
    ? item.sourceIds.filter((id): id is string => typeof id === "string" && allowed.has(id)) : [];
  return { sampleSize: data.sampleSize, fingerprint: patternFingerprint(data),
    sections: Object.fromEntries(patternSections.map((section) => [section, (item[section] as string).trim().slice(0, 1400)])) as Record<PatternSection, string>,
    sourceIds, usedFallback: false };
}
