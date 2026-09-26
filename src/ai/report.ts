import { structuredResponse } from "./openai.ts";
import type { RunSummary, ScientificSource } from "./schemas.ts";

export type MissionReport = {
  result: "PASS" | "FAIL";
  researchLandscape?: string;
  evaluationSystem?: string;
  evidenceBasedChanges?: string;
  contribution?: string;
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

const fields = ["researchLandscape", "scientificContext", "evaluationSystem", "overview", "production", "stability",
  "disasterResponse", "missionControl", "evidenceBasedChanges", "layout", "agriculture", "strategySuggests", "contribution"] as const;
const reportSchema = {
  type: "object", additionalProperties: false,
  properties: Object.fromEntries([...fields.map((field) => [field, { type: "string" }]), ["sourceIds", { type: "array", items: { type: "string" } }]]),
  required: [...fields, "sourceIds"],
};

export function fallbackReport(summary: RunSummary, passed: boolean, sources: readonly ScientificSource[] = []): MissionReport {
  const crop = summary.productionMetrics.cropYield ?? 0;
  const meat = summary.productionMetrics.meatYield ?? 0;
  const research = summary.productionMetrics.researchSamples ?? 0;
  const connected = Math.round((summary.layoutMetrics.connectedModuleShare ?? 0) * 100);
  const water = summary.stabilityMetrics.averageWater ?? summary.stabilityMetrics.finalWater ?? 0;
  const decisions = summary.majorPlayerDecisions.slice(0, 3).join("; ") || "No detailed actions were recorded";
  return {
    result: passed ? "PASS" : "FAIL",
    researchLandscape: "NASA has studied plant growth in orbit with Veggie and the Advanced Plant Habitat, while ground-based biomass chambers have explored crop production in controlled environments. ESA's MELiSSA programme studies linked biological and physical recycling processes. These are research directions, not evidence that this game's yields or lunar livestock are feasible.",
    evaluationSystem: `The transparent rules contribute up to 70 points: production 28, stability 24, efficiency 8, resilience 6, and budget 4. A separate strategy evaluation can contribute up to 30 points for coherence, innovation, trade-offs, and scientific reasoning. This run's rule components were ${summary.finalScoreInputs.production}/28, ${summary.finalScoreInputs.stability}/24, ${summary.finalScoreInputs.efficiency}/8, ${summary.finalScoreInputs.resilience}/6, and ${summary.finalScoreInputs.budget}/4 respectively.`,
    evidenceBasedChanges: `${connected < 80 ? `First connect more than the current ${connected}% of modules to the habitat; isolated equipment cannot reliably support production or protection.` : `The ${connected}% connected-module share is a useful base; next compare alternative routes for the same demand.`} ${water < 20 ? `The average water reserve was ${water}, so test more reliable recycling and shorter greenhouse delivery paths.` : `The average water reserve was ${water}; compare this margin against construction cost before adding more capacity.`} Controlled-environment research motivates monitoring water, light, and temperature together, but does not prescribe this game's numeric settings.`,
    contribution: `This run tested a specific design hypothesis: ${decisions}. It recorded ${crop} edible crop units, ${meat} meat units, and ${research} research samples under the game's simplified constraints. Compare it with other player strategies to formulate questions for further study; a game result is not a scientific validation of lunar farming.`,
    overview: `This ${summary.mode} mission ${passed ? "met" : "did not meet"} its survival and production goals.`,
    production: `Cumulative edible crop yield: ${crop}. Cumulative meat yield: ${meat}. Research samples: ${research} (not food or crop score).`,
    stability: `Final power ${summary.stabilityMetrics.finalPower}, water ${summary.stabilityMetrics.finalWater}, oxygen ${summary.stabilityMetrics.finalOxygen}, food ${summary.stabilityMetrics.finalFood}, temperature ${summary.stabilityMetrics.finalTemperature}.`,
    layout: `${summary.layoutMetrics.moduleCount} modules used ${summary.layoutMetrics.corridorLength} corridor cells. ${connected}% of modules were connected to the habitat; ${Math.round((summary.layoutMetrics.resilienceBudgetShare ?? 0) * 100)}% of module cost went to protective systems. Compare shorter paths and redundant routes before assuming that adding a module improves delivery.`,
    disasterResponse: `${summary.hazardHistory.length} major hazards and ${summary.stabilityMetrics.crisisCount ?? 0} crisis events were recorded.`,
    agriculture: `The base produced ${crop} edible crop units, ${meat} meat units, and ${research} research samples. Research samples do not contribute food or crop score. This simplified simulation models crop and livestock choices as strategic trade-offs. Large-animal lunar livestock is speculative and educational.`,
    missionControl: `${summary.photonAdviceHistory.length} Mission Control messages were recorded.`,
    scientificContext: "Lunar agriculture requires coordinated life support, energy, water, and thermal control. The linked scientific sources provide context for this educational simulation, not validation of its simplified model.",
    strategySuggests: `${decisions}. This player strategy is one design hypothesis worth exploring; it does not establish an optimal real lunar base.`,
    sourceIds: sources.filter((source) => ["nasa-space-crops", "nasa-biomass", "nasa-illumination", "esa-melissa"].includes(source.id)).map((source) => source.id), usedFallback: true,
  };
}

export async function generateMissionReport(summary: RunSummary, passed: boolean, sources: readonly ScientificSource[]): Promise<MissionReport> {
  const raw = await structuredResponse("mission_report", reportSchema,
    "Write a substantive, evidence-grounded mission report with distinct paragraphs in every field. First explain the current state of space agriculture research in researchLandscape and scientificContext, clearly separating orbital and ground experiments from unproven lunar deployment. In evaluationSystem explain the 70-point transparent rules and 30-point strategy rubric, using the supplied score inputs. In overview, production, stability, disasterResponse, and missionControl evaluate this particular run with actual numbers or events; never invent them. In evidenceBasedChanges, layout, agriculture, and strategySuggests give specific, testable changes tied to this run and relevant research context. In contribution describe the player's design-space hypothesis and what this run adds as an observation, never a scientific discovery or proven optimum. Give each field 2-4 useful sentences, avoid repeated generic praise, and do not duplicate simple yield scoring in strategic judgments. Research samples are not food. Large-animal lunar livestock is speculative and gameified. Do not put URLs or invented citations in prose; choose 3-5 citation IDs only from the supplied registry in sourceIds. Return JSON with all requested fields.",
    { summary, passed, sources: sources.map(({ id, title, organization, tags, shortContext }) => ({ id, title, organization, tags, shortContext })) },
    { maxOutputTokens: 2600, timeoutMs: 22000 });
  if (!raw || typeof raw !== "object") return fallbackReport(summary, passed, sources);
  const item = raw as Record<string, unknown>;
  if (fields.some((field) => typeof item[field] !== "string" || !(item[field] as string).trim())) return fallbackReport(summary, passed, sources);
  const allowed = new Set(sources.map((source) => source.id));
  const sourceIds = Array.isArray(item.sourceIds) ? item.sourceIds.filter((id): id is string => typeof id === "string" && allowed.has(id)) : [];
  return { result: passed ? "PASS" : "FAIL", ...Object.fromEntries(fields.map((field) => [field, (item[field] as string).slice(0, 1800)])) as Pick<MissionReport, typeof fields[number]>, sourceIds, usedFallback: false };
}
