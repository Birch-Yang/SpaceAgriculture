import { structuredResponse } from "./openai.ts";
import { validateEvaluation, type EvaluationResult, type RunSummary } from "./schemas.ts";

const evaluationSchema = {
  type: "object", additionalProperties: false,
  properties: {
    strategicCoherence: { type: "number" }, designInnovation: { type: "number" },
    tradeoffQuality: { type: "number" }, scientificReasoning: { type: "number" }, rationale: { type: "string" },
  },
  required: ["strategicCoherence", "designInnovation", "tradeoffQuality", "scientificReasoning", "rationale"],
};

export async function evaluateStrategy(summary: RunSummary): Promise<EvaluationResult | undefined> {
  const raw = await structuredResponse("strategy_evaluation", evaluationSchema,
    "Evaluate strategic coherence (0-10), design innovation (0-8), trade-off quality (0-7), and scientific reasoning (0-5). Return JSON. Do not duplicate simple crop yield scoring. Large-animal lunar livestock is speculative. Use only the supplied summary; never invent events or citations.", summary);
  return validateEvaluation(raw);
}
