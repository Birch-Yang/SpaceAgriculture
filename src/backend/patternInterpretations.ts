import { unstable_cache } from "next/cache";
import { structuredResponse } from "../ai/openai.ts";
import { verifiedSources } from "../ai/sourceAdapter.ts";
import { getAggregateAnalytics } from "./analytics.ts";
import { fallbackPatternNarrative, patternSections, validatePatternNarrative } from "./patternNarrative.ts";

const schema = { type: "object", additionalProperties: false,
  properties: { ...Object.fromEntries(patternSections.map((section) => [section, { type: "string" }])),
    sourceIds: { type: "array", items: { type: "string" } } },
  required: [...patternSections, "sourceIds"] };

// A fixed one-hour cache key bounds paid interpretation calls as live runs arrive.
export const getCachedPatternInterpretations = unstable_cache(async () => {
  const data = await getAggregateAnalytics();
  const sourceIds = verifiedSources.map((source) => source.id);
  if (!data.sampleSize) return fallbackPatternNarrative(data, sourceIds.slice(0, 3));
  const raw = await structuredResponse("player_patterns_interpretation", schema,
    "Write one evidence-grounded interpretation for each named panel, 70-110 English words per panel. Use only the supplied aggregate numbers and research-source summaries. In outcomes, compare successful and failed runs, describe the common final choices as associations, and note when a group is too small. In agriculture explain what frequent choices may mean, including defaults or selection effects. In output, interpret edible crop and meat output, crop yield per greenhouse, efficiency and passed-versus-failed crop yield; explain what looks strong or weak, distinguish research samples from food, and suggest a controlled comparison without claiming causality. In decisions distinguish action counts from unique players. In pressure and tradeoff compare group sizes and note when one group is empty. Top quartile is by score and can include failed missions. Never invent sample sizes, percentages, player identities, p-values or scientific findings. Distinguish orbital/ground plant research from unproven lunar deployment. Do not claim causality. Mention the number of automated demonstration runs and that this is a self-selected game sample. Choose sourceIds only from the supplied list; do not put URLs in prose.",
    { data, sources: verifiedSources.map(({ id, title, organization, shortContext }) => ({ id, title, organization, shortContext })) },
    { maxOutputTokens: 3000, timeoutMs: 22000 });
  return validatePatternNarrative(raw, data, sourceIds) ?? fallbackPatternNarrative(data, sourceIds.slice(0, 3));
}, ["player-pattern-interpretations-v2"], { revalidate: 3600 });
