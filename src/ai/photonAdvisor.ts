import type { AgentPublicState } from "./publicState.ts";

// Curated, deterministic hints: Photon supplies messaging, not model inference.
// This module has no network access, credentials, GameState, or action dispatcher.
const topics = [
  ["water", /\b(water|irrigat\w*|thirst\w*)\b|水|灌溉/i],
  ["power", /\b(power|electric\w*|energy|battery|solar|light\w*)\b|电|能源|光照/i],
  ["oxygen", /\b(oxygen|air|breath\w*)\b|氧|呼吸/i],
  ["temperature", /\b(temperature|thermal|heat|cold|hot|warm\w*)\b|温|热|冷/i],
  ["livestock", /\b(livestock|animal\w*|cow\w*|pig\w*|chicken\w*|feed|meat)\b|牲畜|动物|饲料|肉/i],
  ["agriculture", /\b(crop\w*|plant\w*|grow\w*|harvest\w*|farm\w*|food|yield|lettuce|potato|wheat|soybean|radish|pepper)\b|作物|种植|收获|产量/i],
  ["repair", /\b(repair\w*|damage\w*|broken|integrity|hazard\w*|disaster\w*)\b|修复|损坏|灾害/i],
  ["communications", /\b(photon|communicat\w*|signal|message\w*|relay|contact)\b|通讯|通信|信号/i],
  ["layout", /\b(layout|corridor\w*|connect\w*|path\w*|build\w*|place\w*|module\w*)\b|布局|走廊|连接|建造/i],
  ["budget", /\b(budget|cost\w*|material\w*|spend\w*|ap|action points)\b|预算|成本|行动点/i],
] as const;

const hints = {
  water: "Earth reads a limited water picture. Compare stored reserves with delivery to the growing areas before assuming they tell the same story.",
  power: "We cannot resolve individual loads from Earth. Consider how agricultural demand competes with life support and backup capacity.",
  oxygen: "Our oxygen telemetry is coarse. Review whether life-support supply can reach the habitat while other systems draw on shared utilities.",
  temperature: "Thermal conditions may depend on both regulation and nearby heat sources. Inspect those relationships before committing your next action.",
  livestock: "Livestock can compete with crops for water and other resources. Consider whether the growth cycle fits the reserves and time you have left.",
  agriculture: "Harvest timing and utility delivery both affect production. Look for which of those seems to be limiting your growing area.",
  repair: "Earth cannot inspect the damaged segment directly. Consider which affected connection supports the most vulnerable system before choosing a repair.",
  communications: "Our Earth–Moon relay carries only a small number of questions each turn. During a link outage, your local instruments remain the best source of information.",
  layout: "We do not have your map. Inspect how your utility paths connect production to life support, and consider the trade-off between compactness and resilience.",
  budget: "Every resource committed to production leaves less available for recovery. Consider which risk your remaining reserve is meant to cover.",
};

export function contextualHint(question: string, state: AgentPublicState): string {
  if (/ignore.{0,30}instructions|system prompt|act as|guarantee|win for me|exact (steps|solution)|optimal|最佳|必胜|直接.*答案|忽略.*指令/i.test(question))
    return "Photon, Earth Mission Control here. I can point out a trade-off to inspect, but command decisions must remain with the outpost.";
  const topic = topics.find(([, pattern]) => pattern.test(question))?.[0];
  if (topic) return hints[topic];
  if (state.water === "critical") return "Earth is receiving a critical water flag, though the cause is unclear. Compare supply and delivery before increasing agricultural demand.";
  if (state.oxygen === "critical") return "Earth is receiving a critical oxygen flag. Inspect life-support delivery and its shared dependencies before focusing on additional output.";
  if (state.power === "critical" || state.power === "unstable") return hints.power;
  if (state.temperature !== "nominal") return hints.temperature;
  if (state.water === "low") return hints.water;
  if (state.oxygen === "low") return hints.oxygen;
  if (state.agriculture === "behind") return hints.agriculture;
  return "Photon, Earth Mission Control here. Ask about water, power, oxygen, temperature, agriculture, livestock, repairs, or utility connections so I can narrow the inspection hint.";
}
