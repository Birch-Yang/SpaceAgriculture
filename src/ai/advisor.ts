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
    HAZARD_TEMPERATURE: "Earth telemetry detects an extreme temperature event at your outpost. Watch the thermal reading and inspect whether powered regulation is holding before your next move.",
    HAZARD_RADIATION: "Earth telemetry detects a solar particle event near your outpost. Watch the oxygen trend and inspect your shelter's condition before your next move.",
    HAZARD_MICROMETEOROID: "Earth telemetry detects a micrometeoroid impact at your outpost. Compare module integrity and utility delivery to see what may have been affected.",
    HAZARD_COMMUNICATIONS: "Earth telemetry detects communications interference near your outpost. Expect signal gaps and watch whether the backup link holds.",
    HAZARD_POWER: "Earth telemetry detects a power shortage at your outpost. Watch the power reserve and inspect supply, storage, and demand before your next move.",
  };
  return fallback[event.type] ?? "Telemetry is limited. Review resource trends before committing the next action.";
}

export async function replyAdvice(question: string, publicState: AgentPublicState): Promise<string> {
  return contextualHint(question.slice(0, 500), publicState);
}
