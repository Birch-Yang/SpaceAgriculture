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
  fallbackFields?: string[];
};

const fields = ["researchLandscape", "scientificContext", "evaluationSystem", "overview", "production", "stability",
  "disasterResponse", "missionControl", "evidenceBasedChanges", "layout", "agriculture", "strategySuggests", "contribution"] as const;
export const MIN_REPORT_FIELD_WORDS = 65;
export const reportWordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export function extendShortReport(report: MissionReport, fallback: MissionReport): MissionReport {
  const shortFields = fields.filter((field) => reportWordCount(report[field] ?? "") < MIN_REPORT_FIELD_WORDS);
  if (!shortFields.length) return report;
  const replacements = Object.fromEntries(shortFields.map((field) => [field, fallback[field]])) as Partial<MissionReport>;
  return { ...report, ...replacements, usedFallback: true,
    fallbackFields: [...new Set([...(report.fallbackFields ?? []), ...shortFields])] };
}
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
  const power = summary.stabilityMetrics.finalPower ?? 0;
  const oxygen = summary.stabilityMetrics.finalOxygen ?? 0;
  const food = summary.stabilityMetrics.finalFood ?? 0;
  const temperature = summary.stabilityMetrics.finalTemperature ?? 0;
  const crisis = summary.stabilityMetrics.crisisCount ?? 0;
  const productionScore = summary.finalScoreInputs.production ?? 0;
  const stabilityScore = summary.finalScoreInputs.stability ?? 0;
  const decisions = summary.majorPlayerDecisions.slice(0, 3).join("; ") || "No detailed actions were recorded";
  return {
    result: passed ? "PASS" : "FAIL",
    researchLandscape: "NASA has studied plant growth in orbit through Veggie and the Advanced Plant Habitat, while ground-based biomass chambers have examined crops inside controlled environments. ESA's MELiSSA programme explores how biological and physical processes might recover resources in a closed life-support loop. These efforts help frame questions about water delivery, lighting, atmosphere, and recycling. They do not demonstrate a complete lunar farm, establish the crop yields in this game, or validate its simplified livestock system. The report treats published research as context for design choices rather than a numerical calibration of the simulation.",
    evaluationSystem: `The transparent rules contribute up to 70 points: production 28, stability 24, efficiency 8, resilience 6, and budget 4. A separate strategy evaluation can contribute up to 30 points for coherence, innovation, trade-offs, and scientific reasoning. This run's rule components were ${summary.finalScoreInputs.production}/28, ${summary.finalScoreInputs.stability}/24, ${summary.finalScoreInputs.efficiency}/8, ${summary.finalScoreInputs.resilience}/6, and ${summary.finalScoreInputs.budget}/4 respectively. The radar chart divides each earned component by its own maximum, making strengths and gaps comparable without treating the axes as equal point totals. When strategy evaluation is unavailable, the rules score is scaled to 100 and the strategy axis is omitted.`,
    evidenceBasedChanges: `${connected < 80 ? `Start by improving the current ${connected}% habitat connection share; isolated equipment cannot reliably support production or protection.` : `The current ${connected}% habitat connection share gives the base a useful starting point; compare alternate routes for the same demand.`} ${water < 20 ? `Average water reserve was ${water}, so test a shorter greenhouse delivery path and more reliable recycling before expanding crop demand.` : `Average water reserve was ${water}; test whether extra capacity improves output enough to justify its construction cost.`} Record the resulting yield, reserve, and crisis count in another run. Controlled-environment research motivates monitoring water, light, and temperature together, but it cannot prescribe this game's exact settings or prove that one simulated layout would work on the Moon.`,
    contribution: `This run tested a specific design hypothesis through these recorded choices: ${decisions}. It produced ${crop} edible crop units, ${meat} meat units, and ${research} research samples under the game's simplified constraints. That observation contributes a concrete strategy for comparison with other player runs, especially where infrastructure choices affected resource margins. A useful next question is whether a different connection or care sequence would preserve similar output with fewer crises or less cost. The result is a simulated design-space observation, not a scientific discovery or validation of lunar agriculture.`,
    overview: `This ${summary.mode} mission ${passed ? "met" : "did not meet"} its survival and production goals within the simulation. The run finished with ${crop} edible crop units, ${meat} meat units, and ${crisis} recorded crisis events. Its transparent rule scores include ${productionScore}/28 for production and ${stabilityScore}/24 for stability, so the headline result should be read alongside the separate system dimensions. A high total can still conceal a weak resource margin or fragile response to hazards. Review the sections below to identify which observed choices deserve a controlled comparison in a new mission.`,
    production: `Cumulative edible crop yield was ${crop}, and cumulative meat yield was ${meat}. The run also collected ${research} research samples; samples are tracked separately and do not count as food or crop score. Production earned ${productionScore} of 28 possible rule points. Read that score together with water and power availability, because an apparent output gain may depend on resource demand that is hard to sustain. In the next run, compare one crop or livestock change at a time and note whether edible yield improves without creating a new shortage.`,
    stability: `Final resource readings were power ${power}, water ${summary.stabilityMetrics.finalWater}, oxygen ${oxygen}, food ${food}, and controlled temperature ${temperature}. The run earned ${stabilityScore} of 24 stability points and recorded ${crisis} crisis events. This score reflects conditions across turns, so the final snapshot alone cannot show every period of strain. Examine any weak reserve against the connected equipment and production load that depended on it. A useful repeat test would change one utility route or allocation and compare both the average reserve and the number of crisis turns.`,
    layout: `${summary.layoutMetrics.moduleCount} modules used ${summary.layoutMetrics.corridorLength} corridor cells, and ${connected}% of modules were connected to the habitat. Protective systems represented ${Math.round((summary.layoutMetrics.resilienceBudgetShare ?? 0) * 100)}% of module cost. Connection matters because an isolated module may appear present on the map without delivering its intended benefit. The next layout experiment should compare a shorter shared route with a redundant route, then record output, resource delivery, and hazard recovery. Additional modules only help when the network can supply them, and a more compact base can still have a critical single point of failure.`,
    disasterResponse: `${summary.hazardHistory.length} major hazards and ${crisis} crisis events were recorded in this run. The resilience dimension rewards connected protective capacity and the observed response to hazardous turns; it does not establish that every possible event was survived. Inspect which systems lost margin when a hazard arrived, and whether a repair or backup route restored useful delivery in time. In a repeat run, reserve some construction budget for protection and compare the recovery record with the present layout. Even a hazard-free run should be treated as limited evidence about resilience because its defenses were not fully exercised.`,
    agriculture: `The base produced ${crop} edible crop units and ${meat} meat units, alongside ${research} research samples that did not contribute to food or crop score. Crop and livestock choices compete for water, power, space, and attention in this simplified model. Compare the observed output with the infrastructure required to sustain it rather than judging a species only by its harvest total. A useful experiment would keep the base layout similar and vary crop care or livestock feed one decision at a time. Large-animal lunar livestock remains speculative; the game's yields are educational trade-offs, not real-world predictions.`,
    missionControl: `${summary.photonAdviceHistory.length} Mission Control messages were recorded for this run. Advice can help identify a resource or connection worth inspecting, but it is not evidence that the suggested action caused an outcome. Evaluate the advice against the visible turn records, the actual network, and the final resource margins. If communication was interrupted, document which local indicators supported the player's decisions during the outage. In the next mission, compare the same decision with and without an advisor prompt while holding the starting layout as similar as possible.`,
    scientificContext: "Lunar agriculture depends on linked life-support, energy, water, thermal, and monitoring systems. Research on orbital plant growth and ground-based closed chambers helps explain why these systems are studied together, while lunar surface deployment remains a separate engineering challenge. In this report, source links support general context and research directions; they do not verify game turn lengths, yields, animal husbandry, or scoring weights. Treat every score as a measurement inside this model. Use the report to formulate a specific follow-up experiment, then distinguish that simulated observation from evidence that would be needed for an actual lunar farm.",
    strategySuggests: `The recorded decisions included ${decisions}. Together they form one testable approach to balancing production, utility delivery, and recovery inside this simulation. For the next run, choose one decision to change while keeping the remaining setup as similar as possible; then compare edible output, the relevant resource reserve, and crisis count. If performance changes, inspect the turn history before attributing the difference to that one action, because hazards and dependencies can also affect the result. This strategy is a design hypothesis, not an established optimum for a real lunar base.`,
    sourceIds: sources.filter((source) => ["nasa-space-crops", "nasa-biomass", "nasa-illumination", "esa-melissa"].includes(source.id)).map((source) => source.id), usedFallback: true,
  };
}

export async function generateMissionReport(summary: RunSummary, passed: boolean, sources: readonly ScientificSource[]): Promise<MissionReport> {
  const raw = await structuredResponse("mission_report", reportSchema,
    `Write a substantive, evidence-grounded mission report with distinct paragraphs in every field. Every text field must contain at least ${MIN_REPORT_FIELD_WORDS} English words; aim for 80-110 words and 4-6 useful sentences per field. First explain the current state of space agriculture research in researchLandscape and scientificContext, clearly separating orbital and ground experiments from unproven lunar deployment. In evaluationSystem explain the 70-point transparent rules and 30-point strategy rubric, using the supplied score inputs. In overview, production, stability, disasterResponse, and missionControl evaluate this particular run with actual numbers or events; never invent them. In evidenceBasedChanges, layout, agriculture, and strategySuggests give specific, testable changes tied to this run and relevant research context. In contribution describe the player's design-space hypothesis and what this run adds as an observation, never a scientific discovery or proven optimum. Avoid repeated generic praise and do not duplicate simple yield scoring in strategic judgments. Research samples are not food. Large-animal lunar livestock is speculative and gameified. Do not put URLs or invented citations in prose; choose 3-5 citation IDs only from the supplied registry in sourceIds. Return JSON with all requested fields.`,
    { summary, passed, sources: sources.map(({ id, title, organization, tags, shortContext }) => ({ id, title, organization, tags, shortContext })) },
    { maxOutputTokens: 4200, timeoutMs: 27000 });
  if (!raw || typeof raw !== "object") return fallbackReport(summary, passed, sources);
  const item = raw as Record<string, unknown>;
  if (fields.some((field) => typeof item[field] !== "string")) return fallbackReport(summary, passed, sources);
  const narratives = Object.fromEntries(fields.map((field) => [field, (item[field] as string).trim().slice(0, 1800)])) as Pick<MissionReport, typeof fields[number]>;
  if (fields.some((field) => reportWordCount(narratives[field] ?? "") < MIN_REPORT_FIELD_WORDS))
    return fallbackReport(summary, passed, sources);
  const allowed = new Set(sources.map((source) => source.id));
  const sourceIds = Array.isArray(item.sourceIds) ? item.sourceIds.filter((id): id is string => typeof id === "string" && allowed.has(id)) : [];
  return { result: passed ? "PASS" : "FAIL", ...narratives, sourceIds, usedFallback: false };
}
