import { publicSupabase } from "./supabase.ts";
import { MODULE_BY_ID } from "../data/modules.ts";
import { moduleDistance } from "../data/systems.ts";
import type { PlacedModule } from "../game/state/types.ts";

export type AggregateAnalytics = {
  sampleSize: number;
  layout: { averageCorridorLength: number; averageGreenhouseWaterDistance: number; averageGreenhouseUtilityDistance?: number; averageModuleDensity?: number; compactGreenhouseShare: number; averageResilienceBudgetShare: number; averageConnectedModuleShare: number };
  agriculture: { cropMix: Record<string, number>; livestockMix: Record<string, number>; cropWaterSettings: Record<string, number>; cropLightSettings: Record<string, number>; cropTemperatureSettings: Record<string, number>; averageCropYield: number; averageMeatYield: number; averageCropYieldPerGreenhouse: number; aggregateCropToMeatRatio?: number | null; averageEfficiencyScore?: number };
  highPerforming: { sampleSize: number; averageCorridorLength: number; averageResilienceBudgetShare: number; averageCropYieldPerGreenhouse: number };
};

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : 0;
}

export function greenhouseDistance(greenhouses: PlacedModule[], targets: PlacedModule[]): number | undefined {
  if (!greenhouses.length || !targets.length) return undefined;
  return average(greenhouses.map((greenhouse) => Math.min(...targets.map((target) => moduleDistance(greenhouse, target)))));
}

export async function getAggregateAnalytics(): Promise<AggregateAnalytics> {
  const client = publicSupabase();
  if (!client) return { sampleSize: 0, layout: { averageCorridorLength: 0, averageGreenhouseWaterDistance: 0, averageGreenhouseUtilityDistance: 0, averageModuleDensity: 0, compactGreenhouseShare: 0, averageResilienceBudgetShare: 0, averageConnectedModuleShare: 0 }, agriculture: { cropMix: {}, livestockMix: {}, cropWaterSettings: {}, cropLightSettings: {}, cropTemperatureSettings: {}, averageCropYield: 0, averageMeatYield: 0, averageCropYieldPerGreenhouse: 0, aggregateCropToMeatRatio: null, averageEfficiencyScore: 0 }, highPerforming: { sampleSize: 0, averageCorridorLength: 0, averageResilienceBudgetShare: 0, averageCropYieldPerGreenhouse: 0 } };
  const { data, error } = await client.from("runs").select("layout_json,strategy_json,crop_yield,meat_yield,score_total,score_efficiency").order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const corridors: number[] = [];
  const distances: number[] = [];
  const utilityDistances: number[] = [];
  const moduleDensities: number[] = [];
  const shares: number[] = [];
  const resilienceShares: number[] = [];
  const connectedShares: number[] = [];
  const greenhouseProductivity: number[] = [];
  const cropMix: Record<string, number> = {};
  const livestockMix: Record<string, number> = {};
  const cropWaterSettings: Record<string, number> = {};
  const cropLightSettings: Record<string, number> = {};
  const cropTemperatureSettings: Record<string, number> = {};
  for (const row of rows) {
    const layout = row.layout_json as { modules?: PlacedModule[]; utilityEdges?: Array<{ from: string; to: string; length: number; integrity: number }> } | null;
    const strategy = row.strategy_json as { crops?: Array<{ crop: string; water?: string; light?: string; temperature?: string }>; livestock?: Array<{ animal: string }> } | null;
    const modules = layout?.modules ?? [];
    corridors.push((layout?.utilityEdges ?? []).reduce((sum, edge) => sum + edge.length, 0));
    const greenhouses = modules.filter((module) => module.moduleId.startsWith("greenhouse"));
    const water = modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "water");
    const utilities = modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "utility");
    const waterDistance = greenhouseDistance(greenhouses, water);
    const utilityDistance = greenhouseDistance(greenhouses, utilities);
    if (waterDistance !== undefined) distances.push(waterDistance);
    if (utilityDistance !== undefined) utilityDistances.push(utilityDistance);
    moduleDensities.push(modules.reduce((sum, module) => {
      const footprint = MODULE_BY_ID.get(module.moduleId)?.footprint;
      return sum + (footprint ? footprint.w * footprint.h : 0);
    }, 0) / 196);
    shares.push(greenhouses.length ? greenhouses.filter((module) => module.moduleId === "greenhouse-compact").length / greenhouses.length : 0);
    const totalCost = modules.reduce((sum, module) => sum + (MODULE_BY_ID.get(module.moduleId)?.cost ?? 0), 0);
    const resilienceCost = modules.reduce((sum, module) => sum + (["shelter", "utility", "battery"].includes(MODULE_BY_ID.get(module.moduleId)?.category ?? "")
      ? (MODULE_BY_ID.get(module.moduleId)?.cost ?? 0) : 0), 0);
    resilienceShares.push(totalCost ? resilienceCost / totalCost : 0);
    greenhouseProductivity.push(greenhouses.length ? (Number(row.crop_yield) || 0) / greenhouses.length : 0);
    const connected = new Set(modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "habitat").map((module) => module.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of layout?.utilityEdges ?? []) {
        if (edge.integrity <= 0.15) continue;
        if (connected.has(edge.from) && !connected.has(edge.to)) { connected.add(edge.to); changed = true; }
        if (connected.has(edge.to) && !connected.has(edge.from)) { connected.add(edge.from); changed = true; }
      }
    }
    connectedShares.push(modules.length ? connected.size / modules.length : 0);
    for (const crop of strategy?.crops ?? []) {
      if (!crop.crop) continue;
      cropMix[crop.crop] = (cropMix[crop.crop] ?? 0) + 1;
      if (crop.water) cropWaterSettings[crop.water] = (cropWaterSettings[crop.water] ?? 0) + 1;
      if (crop.light) cropLightSettings[crop.light] = (cropLightSettings[crop.light] ?? 0) + 1;
      if (crop.temperature) cropTemperatureSettings[crop.temperature] = (cropTemperatureSettings[crop.temperature] ?? 0) + 1;
    }
    for (const animal of strategy?.livestock ?? []) livestockMix[animal.animal] = (livestockMix[animal.animal] ?? 0) + 1;
  }
  const scored = rows.filter((row) => row.score_total != null && Number.isFinite(Number(row.score_total)));
  const top = scored.sort((a, b) => Number(b.score_total) - Number(a.score_total)).slice(0, Math.ceil(scored.length / 4));
  const topCorridors = top.map((row) => ((row.layout_json as { utilityEdges?: Array<{ length: number }> } | null)?.utilityEdges ?? [])
    .reduce((sum, edge) => sum + edge.length, 0));
  const topResilience = top.map((row) => {
    const modules = (row.layout_json as { modules?: Array<{ moduleId: string }> } | null)?.modules ?? [];
    const totalCost = modules.reduce((sum, module) => sum + (MODULE_BY_ID.get(module.moduleId)?.cost ?? 0), 0);
    const protectiveCost = modules.reduce((sum, module) => sum + (["shelter", "utility", "battery"].includes(MODULE_BY_ID.get(module.moduleId)?.category ?? "")
      ? (MODULE_BY_ID.get(module.moduleId)?.cost ?? 0) : 0), 0);
    return totalCost ? protectiveCost / totalCost : 0;
  });
  const topProductivity = top.map((row) => {
    const greenhouses = (row.layout_json as { modules?: Array<{ moduleId: string }> } | null)?.modules?.filter((module) => module.moduleId.startsWith("greenhouse")) ?? [];
    return greenhouses.length ? (Number(row.crop_yield) || 0) / greenhouses.length : 0;
  });
  const totalMeat = rows.reduce((sum, row) => sum + (Number(row.meat_yield) || 0), 0);
  const totalCrop = rows.reduce((sum, row) => sum + (Number(row.crop_yield) || 0), 0);
  return { sampleSize: rows.length, layout: { averageCorridorLength: average(corridors), averageGreenhouseWaterDistance: average(distances), averageGreenhouseUtilityDistance: average(utilityDistances), averageModuleDensity: average(moduleDensities), compactGreenhouseShare: average(shares), averageResilienceBudgetShare: average(resilienceShares), averageConnectedModuleShare: average(connectedShares) },
    agriculture: { cropMix, livestockMix, cropWaterSettings, cropLightSettings, cropTemperatureSettings,
      averageCropYield: average(rows.map((row) => Number(row.crop_yield) || 0)), averageMeatYield: average(rows.map((row) => Number(row.meat_yield) || 0)), averageCropYieldPerGreenhouse: average(greenhouseProductivity),
      aggregateCropToMeatRatio: totalMeat ? Math.round(totalCrop / totalMeat * 100) / 100 : null,
      averageEfficiencyScore: average(rows.map((row) => Number(row.score_efficiency) || 0)) },
    highPerforming: { sampleSize: top.length, averageCorridorLength: average(topCorridors), averageResilienceBudgetShare: average(topResilience), averageCropYieldPerGreenhouse: average(topProductivity) } };
}
