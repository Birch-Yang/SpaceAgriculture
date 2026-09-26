import { publicSupabase } from "./supabase.ts";
import { MODULE_BY_ID } from "../data/modules.ts";

export type AggregateAnalytics = {
  sampleSize: number;
  layout: { averageCorridorLength: number; averageGreenhouseWaterDistance: number; compactGreenhouseShare: number; averageResilienceBudgetShare: number; averageConnectedModuleShare: number };
  agriculture: { cropMix: Record<string, number>; livestockMix: Record<string, number>; averageCropYield: number; averageMeatYield: number; averageCropYieldPerGreenhouse: number };
};

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : 0;
}

export async function getAggregateAnalytics(): Promise<AggregateAnalytics> {
  const client = publicSupabase();
  if (!client) return { sampleSize: 0, layout: { averageCorridorLength: 0, averageGreenhouseWaterDistance: 0, compactGreenhouseShare: 0, averageResilienceBudgetShare: 0, averageConnectedModuleShare: 0 }, agriculture: { cropMix: {}, livestockMix: {}, averageCropYield: 0, averageMeatYield: 0, averageCropYieldPerGreenhouse: 0 } };
  const { data, error } = await client.from("runs").select("layout_json,strategy_json,crop_yield,meat_yield").order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const corridors: number[] = [];
  const distances: number[] = [];
  const shares: number[] = [];
  const resilienceShares: number[] = [];
  const connectedShares: number[] = [];
  const greenhouseProductivity: number[] = [];
  const cropMix: Record<string, number> = {};
  const livestockMix: Record<string, number> = {};
  for (const row of rows) {
    const layout = row.layout_json as { modules?: Array<{ id: string; moduleId: string; x: number; y: number }>; utilityEdges?: Array<{ from: string; to: string; length: number; integrity: number }> } | null;
    const strategy = row.strategy_json as { crops?: Array<{ crop: string }>; livestock?: Array<{ animal: string }> } | null;
    const modules = layout?.modules ?? [];
    corridors.push((layout?.utilityEdges ?? []).reduce((sum, edge) => sum + edge.length, 0));
    const greenhouses = modules.filter((module) => module.moduleId.startsWith("greenhouse"));
    const water = modules.filter((module) => module.moduleId === "water-recycler");
    for (const greenhouse of greenhouses) if (water.length) distances.push(Math.min(...water.map((module) => Math.abs(module.x - greenhouse.x) + Math.abs(module.y - greenhouse.y))));
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
    for (const crop of strategy?.crops ?? []) cropMix[crop.crop] = (cropMix[crop.crop] ?? 0) + 1;
    for (const animal of strategy?.livestock ?? []) livestockMix[animal.animal] = (livestockMix[animal.animal] ?? 0) + 1;
  }
  return { sampleSize: rows.length, layout: { averageCorridorLength: average(corridors), averageGreenhouseWaterDistance: average(distances), compactGreenhouseShare: average(shares), averageResilienceBudgetShare: average(resilienceShares), averageConnectedModuleShare: average(connectedShares) },
    agriculture: { cropMix, livestockMix, averageCropYield: average(rows.map((row) => Number(row.crop_yield) || 0)), averageMeatYield: average(rows.map((row) => Number(row.meat_yield) || 0)), averageCropYieldPerGreenhouse: average(greenhouseProductivity) } };
}
