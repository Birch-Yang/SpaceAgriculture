import { structuredResponse } from "./openai.ts";
import type { RunSummary, ScientificSource } from "./schemas.ts";

export type MissionReport = {
  result: "PASS" | "FAIL";
  overview: string;
  production: string;
  stability: string;
  layout: string;
  disasterResponse: string;
  agriculture: string;
  missionControl: string;
  scientificContext: string;
  strategySuggests: string;
  sourceIds: string[];
  usedFallback: boolean;
};

const fields = ["overview", "production", "stability", "layout", "disasterResponse", "agriculture", "missionControl", "scientificContext", "strategySuggests"] as const;
const reportSchema = {
  type: "object", additionalProperties: false,
  properties: Object.fromEntries([...fields.map((field) => [field, { type: "string" }]), ["sourceIds", { type: "array", items: { type: "string" } }]]),
  required: [...fields, "sourceIds"],
};

export function fallbackReport(summary: RunSummary, passed: boolean, sources: readonly ScientificSource[] = []): MissionReport {
  const crop = summary.productionMetrics.cropYield ?? 0;
  const meat = summary.productionMetrics.meatYield ?? 0;
  return {
    result: passed ? "PASS" : "FAIL",
    overview: `This ${summary.mode} mission ${passed ? "met" : "did not meet"} its survival and production goals.`,
    production: `Cumulative crop yield: ${crop}. Cumulative meat yield: ${meat}.`,
    stability: `Final power ${summary.stabilityMetrics.finalPower}, water ${summary.stabilityMetrics.finalWater}, oxygen ${summary.stabilityMetrics.finalOxygen}, food ${summary.stabilityMetrics.finalFood}, temperature ${summary.stabilityMetrics.finalTemperature}.`,
    layout: `${summary.layoutMetrics.moduleCount} modules used ${summary.layoutMetrics.corridorLength} corridor cells. ${Math.round((summary.layoutMetrics.connectedModuleShare ?? 0) * 100)}% of modules were connected to the habitat; ${Math.round((summary.layoutMetrics.resilienceBudgetShare ?? 0) * 100)}% of module cost went to protective systems.`,
    disasterResponse: `${summary.hazardHistory.length} major hazards and ${summary.stabilityMetrics.crisisCount ?? 0} crisis events were recorded.`,
    agriculture: `The base produced ${crop} crop units and ${meat} meat units. This simplified simulation models crop and livestock choices as strategic trade-offs. Large-animal lunar livestock is speculative and educational.`,
    missionControl: `${summary.photonAdviceHistory.length} Mission Control messages were recorded.`,
    scientificContext: "Lunar agriculture requires coordinated life support, energy, water, and thermal control. The linked scientific sources provide context for this educational simulation, not validation of its simplified model.",
    strategySuggests: `${summary.majorPlayerDecisions.slice(0, 3).join("; ") || "No detailed actions were recorded"}. This player strategy is one design hypothesis worth exploring; it does not establish an optimal real lunar base.`,
    sourceIds: sources.slice(0, 3).map((source) => source.id), usedFallback: true,
  };
}

export async function generateMissionReport(summary: RunSummary, passed: boolean, sources: readonly ScientificSource[]): Promise<MissionReport> {
  const raw = await structuredResponse("mission_report", reportSchema,
    "Write a concise scientific mission report. Include cautious wording about observed player strategies; never claim a proven optimal NASA design. Say explicitly that large-animal lunar livestock is speculative and gameified. Do not put citations, URLs, or source titles in prose. Choose citations only by ID from the supplied verified source registry in sourceIds. Return JSON with the requested sections and sourceIds.",
    { summary, passed, sources: sources.map(({ id, title, organization, tags, shortContext }) => ({ id, title, organization, tags, shortContext })) });
  if (!raw || typeof raw !== "object") return fallbackReport(summary, passed, sources);
  const item = raw as Record<string, unknown>;
  if (fields.some((field) => typeof item[field] !== "string")) return fallbackReport(summary, passed, sources);
  const allowed = new Set(sources.map((source) => source.id));
  const sourceIds = Array.isArray(item.sourceIds) ? item.sourceIds.filter((id): id is string => typeof id === "string" && allowed.has(id)) : [];
  return { result: passed ? "PASS" : "FAIL", ...Object.fromEntries(fields.map((field) => [field, (item[field] as string).slice(0, 1800)])) as Pick<MissionReport, typeof fields[number]>, sourceIds, usedFallback: false };
}
