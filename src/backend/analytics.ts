import { publicSupabase } from "./supabase.ts";

export type AggregateAnalytics = {
  sampleSize: number;
  layout: { averageCorridorLength: number; averageGreenhouseWaterDistance: number; compactGreenhouseShare: number; averageResilienceBudgetShare: number };
  agriculture: { cropMix: Record<string, number>; livestockMix: Record<string, number>; averageCropYield: number; averageMeatYield: number };
};

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : 0;
}

export async function getAggregateAnalytics(): Promise<AggregateAnalytics> {
  const client = publicSupabase();
  if (!client) return { sampleSize: 0, layout: { averageCorridorLength: 0, averageGreenhouseWaterDistance: 0, compactGreenhouseShare: 0, averageResilienceBudgetShare: 0 }, agriculture: { cropMix: {}, livestockMix: {}, averageCropYield: 0, averageMeatYield: 0 } };
  const { data, error } = await client.from("runs").select("layout_json,strategy_json,crop_yield,meat_yield").limit(1000);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const corridors: number[] = [];
  const distances: number[] = [];
  const shares: number[] = [];
  const resilienceShares: number[] = [];
  const cropMix: Record<string, number> = {};
  const livestockMix: Record<string, number> = {};
  for (const row of rows) {
    const layout = row.layout_json as { modules?: Array<{ moduleId: string; x: number; y: number }>; utilityEdges?: Array<{ length: number }> } | null;
    const strategy = row.strategy_json as { crops?: Array<{ crop: string }>; livestock?: Array<{ animal: string }> } | null;
    const modules = layout?.modules ?? [];
    corridors.push((layout?.utilityEdges ?? []).reduce((sum, edge) => sum + edge.length, 0));
    const greenhouses = modules.filter((module) => module.moduleId.startsWith("greenhouse"));
    const water = modules.filter((module) => module.moduleId === "water-recycler");
    for (const greenhouse of greenhouses) if (water.length) distances.push(Math.min(...water.map((module) => Math.abs(module.x - greenhouse.x) + Math.abs(module.y - greenhouse.y))));
    shares.push(greenhouses.length ? greenhouses.filter((module) => module.moduleId === "greenhouse-compact").length / greenhouses.length : 0);
    resilienceShares.push(modules.length ? modules.filter((module) => ["shelter", "utility-thermal", "battery"].includes(module.moduleId)).length / modules.length : 0);
    for (const crop of strategy?.crops ?? []) cropMix[crop.crop] = (cropMix[crop.crop] ?? 0) + 1;
    for (const animal of strategy?.livestock ?? []) livestockMix[animal.animal] = (livestockMix[animal.animal] ?? 0) + 1;
  }
  return { sampleSize: rows.length, layout: { averageCorridorLength: average(corridors), averageGreenhouseWaterDistance: average(distances), compactGreenhouseShare: average(shares), averageResilienceBudgetShare: average(resilienceShares) },
    agriculture: { cropMix, livestockMix, averageCropYield: average(rows.map((row) => Number(row.crop_yield) || 0)), averageMeatYield: average(rows.map((row) => Number(row.meat_yield) || 0)) } };
}
