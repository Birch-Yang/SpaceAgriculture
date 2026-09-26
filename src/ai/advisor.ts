import { contextualHint } from "./photonAdvisor.ts";
import type { AgentEvent, AgentPublicState } from "./publicState.ts";

// The existing async contract now returns curated hints without any model provider.
export async function eventAdvice(event: AgentEvent): Promise<string> {
  const fallback: Record<string, string> = {
    WATER_CRISIS: "Water telemetry is critical. Check delivery paths and prioritize recovery before changing farm settings.",
    CRISIS_RECOVERY: "Critical systems appear to have recovered. Keep reserve capacity available while operations stabilize.",
    CROP_YIELD_MILESTONE: "The first harvest is a useful milestone. Watch its water and power cost alongside output.",
    MEAT_YIELD_MILESTONE: "Livestock output has begun. Compare feed and water use with the crop contribution.",
    POWER_INSTABILITY: "Power looks unstable. Inspect corridor integrity and backup allocation before increasing demand.",
    CROP_OUTPUT_BEHIND: "Agricultural output appears behind pace. Review utility delivery and crop cycle timing.",
    PRODUCTION_TARGET_REACHED: "Production targets appear met. Preserve life-support stability through the remaining turns.",
    THERMAL_CONFIGURATION: "Thermal conditions look unsafe. Check powered regulation and nearby module placement.",
  };
  return fallback[event.type] ?? "Telemetry is limited. Review resource trends before committing the next action.";
}

export async function replyAdvice(question: string, publicState: AgentPublicState): Promise<string> {
  return contextualHint(question.slice(0, 500), publicState);
}
