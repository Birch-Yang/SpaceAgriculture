import type { HazardType } from "../game/state/types.ts";

export const HAZARDS: Record<HazardType, { weight: number; pressure: number; label: string }> = {
  temperature: { weight: 3, pressure: 20, label: "Extreme temperature" },
  radiation: { weight: 2, pressure: 25, label: "Solar particle event" },
  micrometeoroid: { weight: 2, pressure: 25, label: "Micrometeoroid impact" },
  communications: { weight: 2, pressure: 15, label: "Communication outage" },
  power: { weight: 3, pressure: 15, label: "Power shortage" },
};
