import { publicSupabase } from "./supabase.ts";
import { MODULE_BY_ID } from "../data/modules.ts";
import { moduleDistance } from "../data/systems.ts";
import type { PlacedModule } from "../game/state/types.ts";
import type { RunTranscript } from "../game/state/transcript.ts";
import type { TurnRecord } from "../game/state/types.ts";
import { summarizeDecisions, summarizePressure } from "./strategyHistory.ts";

export type AggregateAnalytics = {
  sampleSize: number;
  layout: { averageCorridorLength: number; averageGreenhouseWaterDistance: number; averageGreenhouseUtilityDistance?: number; averageModuleDensity?: number; compactGreenhouseShare: number; averageResilienceBudgetShare: number; averageConnectedModuleShare: number };
  agriculture: { cropMix: Record<string, number>; livestockMix: Record<string, number>; cropWaterSettings: Record<string, number>; cropLightSettings: Record<string, number>; cropTemperatureSettings: Record<string, number>; averageCropYield: number; averageMeatYield: number; averageCropYieldPerGreenhouse: number; aggregateCropToMeatRatio?: number | null; averageEfficiencyScore?: number };
  highPerforming: { sampleSize: number; averageCorridorLength: number; averageResilienceBudgetShare: number; averageCropYieldPerGreenhouse: number };
  decisions?: { sampleSize: number; plantedByCrop: Record<string, number>; harvestedByCrop: Record<string, number>; cropSwitches: number; parameterChanges: number; highLightSelections: number; lowWaterSelections: number; earlyChanges: number; lateChanges: number };
  pressure?: { sampleSize: number; pressureTurns: number; ordinaryTurns: number; averageCropYieldUnderPressure: number; averageCropYieldWithoutPressure: number; nearWater: { runs: number; averageCropYieldPerPressureTurn: number }; farFromWater: { runs: number; averageCropYieldPerPressureTurn: number } };
  tradeoff?: { threshold: number; higherResilience: { runs: number; averageProductionScore: number; averageResilienceScore: number }; lowerResilience: { runs: number; averageProductionScore: number; averageResilienceScore: number } };
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
  if (!client) throw new Error("Player patterns need Supabase project URL and publishable key");
  const { data, error } = await client.from("runs").select("layout_json,strategy_json,crop_yield,meat_yield,score_total,score_efficiency,score_production,score_resilience").order("created_at", { ascending: false }).limit(1000);
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
  const { data: historyRows, error: historyError } = await client.from("runs")
    .select("summary_json,layout_json").order("created_at", { ascending: false }).limit(200);
  if (historyError) throw new Error(historyError.message);
  const decisions = { sampleSize: 0, plantedByCrop: {} as Record<string, number>, harvestedByCrop: {} as Record<string, number>,
    cropSwitches: 0, parameterChanges: 0, highLightSelections: 0, lowWaterSelections: 0, earlyChanges: 0, lateChanges: 0 };
  const pressure = { sampleSize: 0, pressureTurns: 0, ordinaryTurns: 0, cropYieldUnderPressure: 0, cropYieldWithoutPressure: 0,
    nearWater: { runs: 0, turns: 0, cropYield: 0 }, farFromWater: { runs: 0, turns: 0, cropYield: 0 } };
  for (const row of historyRows ?? []) {
    const replay = (row.summary_json as { replay?: { transcript?: RunTranscript; turnRecords?: TurnRecord[] } } | null)?.replay;
    if (replay?.transcript) {
      try {
        const observed = summarizeDecisions(replay.transcript);
        decisions.sampleSize++;
        for (const [crop, count] of Object.entries(observed.plantedByCrop)) decisions.plantedByCrop[crop] = (decisions.plantedByCrop[crop] ?? 0) + count;
        for (const [crop, count] of Object.entries(observed.harvestedByCrop)) decisions.harvestedByCrop[crop] = (decisions.harvestedByCrop[crop] ?? 0) + count;
        for (const key of ["cropSwitches", "parameterChanges", "highLightSelections", "lowWaterSelections", "earlyChanges", "lateChanges"] as const)
          decisions[key] += observed[key];
      } catch { /* Older or incompatible transcripts are excluded from process metrics. */ }
    }
    if (!Array.isArray(replay?.turnRecords) || !replay.turnRecords.length) continue;
    try {
      const observed = summarizePressure(replay.turnRecords);
      if (!Number.isFinite(observed.cropYieldUnderPressure) || !Number.isFinite(observed.cropYieldWithoutPressure)) continue;
      pressure.sampleSize++; pressure.pressureTurns += observed.pressureTurns; pressure.ordinaryTurns += observed.ordinaryTurns;
      pressure.cropYieldUnderPressure += observed.cropYieldUnderPressure; pressure.cropYieldWithoutPressure += observed.cropYieldWithoutPressure;
      if (observed.pressureTurns) {
        const modules = (row.layout_json as { modules?: PlacedModule[] } | null)?.modules ?? [];
        const greenhouses = modules.filter((module) => module.moduleId.startsWith("greenhouse"));
        const water = modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "water");
        const distance = greenhouseDistance(greenhouses, water);
        if (distance !== undefined) {
          const group = distance <= 3 ? pressure.nearWater : pressure.farFromWater;
          group.runs++; group.turns += observed.pressureTurns; group.cropYield += observed.cropYieldUnderPressure;
        }
      }
    } catch { /* Incomplete older records do not invalidate other observations. */ }
  }
  const tradeoff = { threshold: 0.2,
    higherResilience: { runs: 0, production: 0, resilience: 0 },
    lowerResilience: { runs: 0, production: 0, resilience: 0 } };
  for (const row of rows) {
    const modules = (row.layout_json as { modules?: Array<{ moduleId: string }> } | null)?.modules ?? [];
    const total = modules.reduce((sum, module) => sum + (MODULE_BY_ID.get(module.moduleId)?.cost ?? 0), 0);
    if (!total || row.score_production == null || row.score_resilience == null) continue;
    const protectedCost = modules.reduce((sum, module) => sum + (["shelter", "utility", "battery"].includes(MODULE_BY_ID.get(module.moduleId)?.category ?? "")
      ? (MODULE_BY_ID.get(module.moduleId)?.cost ?? 0) : 0), 0);
    const group = protectedCost / total >= tradeoff.threshold ? tradeoff.higherResilience : tradeoff.lowerResilience;
    group.runs++; group.production += Number(row.score_production); group.resilience += Number(row.score_resilience);
  }
  const tradeoffGroup = (group: { runs: number; production: number; resilience: number }) => ({ runs: group.runs,
    averageProductionScore: group.runs ? Math.round(group.production / group.runs * 100) / 100 : 0,
    averageResilienceScore: group.runs ? Math.round(group.resilience / group.runs * 100) / 100 : 0 });
  return { sampleSize: rows.length, layout: { averageCorridorLength: average(corridors), averageGreenhouseWaterDistance: average(distances), averageGreenhouseUtilityDistance: average(utilityDistances), averageModuleDensity: average(moduleDensities), compactGreenhouseShare: average(shares), averageResilienceBudgetShare: average(resilienceShares), averageConnectedModuleShare: average(connectedShares) },
    agriculture: { cropMix, livestockMix, cropWaterSettings, cropLightSettings, cropTemperatureSettings,
      averageCropYield: average(rows.map((row) => Number(row.crop_yield) || 0)), averageMeatYield: average(rows.map((row) => Number(row.meat_yield) || 0)), averageCropYieldPerGreenhouse: average(greenhouseProductivity),
      aggregateCropToMeatRatio: totalMeat ? Math.round(totalCrop / totalMeat * 100) / 100 : null,
      averageEfficiencyScore: average(rows.map((row) => Number(row.score_efficiency) || 0)) },
    highPerforming: { sampleSize: top.length, averageCorridorLength: average(topCorridors), averageResilienceBudgetShare: average(topResilience), averageCropYieldPerGreenhouse: average(topProductivity) },
    decisions, pressure: { sampleSize: pressure.sampleSize, pressureTurns: pressure.pressureTurns, ordinaryTurns: pressure.ordinaryTurns,
      averageCropYieldUnderPressure: pressure.pressureTurns ? Math.round(pressure.cropYieldUnderPressure / pressure.pressureTurns * 100) / 100 : 0,
      averageCropYieldWithoutPressure: pressure.ordinaryTurns ? Math.round(pressure.cropYieldWithoutPressure / pressure.ordinaryTurns * 100) / 100 : 0,
      nearWater: { runs: pressure.nearWater.runs, averageCropYieldPerPressureTurn: pressure.nearWater.turns ? Math.round(pressure.nearWater.cropYield / pressure.nearWater.turns * 100) / 100 : 0 },
      farFromWater: { runs: pressure.farFromWater.runs, averageCropYieldPerPressureTurn: pressure.farFromWater.turns ? Math.round(pressure.farFromWater.cropYield / pressure.farFromWater.turns * 100) / 100 : 0 } },
    tradeoff: { threshold: tradeoff.threshold, higherResilience: tradeoffGroup(tradeoff.higherResilience), lowerResilience: tradeoffGroup(tradeoff.lowerResilience) } };
}
