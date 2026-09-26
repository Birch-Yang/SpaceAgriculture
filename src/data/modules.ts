import type { ModuleDefinition } from "../game/state/types.ts";

export const MODULES: readonly ModuleDefinition[] = [
  { id: "habitat-core", label: "Habitat Core", category: "habitat", cost: 20, footprint: { w: 2, h: 2 }, flow: { powerDemand: 2, waterDemand: 1, oxygenDemand: 1 }, heatOutput: 1, baseYield: 0, capacity: 0, resilience: 0.5 },
  { id: "greenhouse-compact", label: "Compact Greenhouse", category: "greenhouse", cost: 18, footprint: { w: 2, h: 2 }, flow: { powerDemand: 3, waterDemand: 3 }, heatOutput: 1, baseYield: 5, capacity: 1, resilience: 0.3 },
  { id: "greenhouse-standard", label: "Standard Greenhouse", category: "greenhouse", cost: 28, footprint: { w: 3, h: 2 }, flow: { powerDemand: 5, waterDemand: 5 }, heatOutput: 2, baseYield: 9, capacity: 2, resilience: 0.4 },
  { id: "greenhouse-industrial", label: "Industrial Greenhouse", category: "greenhouse", cost: 42, footprint: { w: 4, h: 3 }, flow: { powerDemand: 9, waterDemand: 9 }, heatOutput: 3, baseYield: 16, capacity: 3, resilience: 0.5 },
  { id: "livestock-compact", label: "Compact Livestock", category: "livestock", cost: 18, footprint: { w: 2, h: 2 }, flow: { powerDemand: 2, waterDemand: 2 }, heatOutput: 1, baseYield: 4, capacity: 1, resilience: 0.3 },
  { id: "livestock-standard", label: "Standard Livestock", category: "livestock", cost: 28, footprint: { w: 3, h: 2 }, flow: { powerDemand: 4, waterDemand: 4 }, heatOutput: 2, baseYield: 8, capacity: 2, resilience: 0.4 },
  { id: "livestock-industrial", label: "Industrial Livestock", category: "livestock", cost: 44, footprint: { w: 4, h: 3 }, flow: { powerDemand: 7, waterDemand: 8 }, heatOutput: 4, baseYield: 15, capacity: 3, resilience: 0.5 },
  { id: "oxygen-generator", label: "Oxygen Generation", category: "oxygen", cost: 15, footprint: { w: 2, h: 1 }, flow: { powerDemand: 3, oxygenSupply: 9 }, heatOutput: 1, baseYield: 0, capacity: 0, resilience: 0.45 },
  { id: "water-recycler", label: "Water Recycling / Storage", category: "water", cost: 16, footprint: { w: 2, h: 1 }, flow: { powerDemand: 2, waterSupply: 9, storage: { water: 25 } }, heatOutput: 1, baseYield: 0, capacity: 0, resilience: 0.45 },
  { id: "solar-array", label: "Solar Array", category: "solar", cost: 15, footprint: { w: 2, h: 2 }, flow: { powerSupply: 16 }, heatOutput: 0, baseYield: 0, capacity: 0, resilience: 0.25 },
  { id: "battery", label: "Battery / Emergency Power", category: "battery", cost: 12, footprint: { w: 1, h: 2 }, flow: { powerSupply: 4, storage: { power: 30 } }, heatOutput: 1, baseYield: 0, capacity: 0, resilience: 0.6 },
  { id: "utility-thermal", label: "Utility / Thermal Module", category: "utility", cost: 16, footprint: { w: 2, h: 2 }, flow: { powerDemand: 2 }, heatOutput: 0, baseYield: 0, capacity: 0, resilience: 0.65 },
  { id: "communication-tower", label: "Communication Tower", category: "communications", cost: 9, footprint: { w: 1, h: 1 }, flow: { powerDemand: 1 }, heatOutput: 0, baseYield: 0, capacity: 0, resilience: 0.35 },
  { id: "shelter", label: "Shelter", category: "shelter", cost: 14, footprint: { w: 2, h: 2 }, flow: { powerDemand: 1 }, heatOutput: 1, baseYield: 0, capacity: 0, resilience: 0.8 },
  { id: "storage", label: "Storage", category: "storage", cost: 9, footprint: { w: 2, h: 1 }, flow: { storage: { water: 15, oxygen: 15, food: 15 } }, heatOutput: 0, baseYield: 0, capacity: 0, resilience: 0.5 },
  { id: "recreation", label: "Recreation Module", category: "recreation", cost: 10, footprint: { w: 2, h: 1 }, flow: { powerDemand: 1 }, heatOutput: 1, baseYield: 0, capacity: 0, resilience: 0.4 },
];

export const MODULE_BY_ID = new Map(MODULES.map((module) => [module.id, module]));
