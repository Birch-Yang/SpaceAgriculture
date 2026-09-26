import type { MissionReport } from "../../ai/report.ts";
import type { RuleScore } from "../simulation/scoring.ts";
import type { RunTranscript } from "./transcript.ts";

export type ReportSnapshot = {
  version: 1;
  runId: string;
  nickname: string;
  score: { total: number; rules: number; llm: number; usedFallback: boolean; breakdown?: RuleScore };
  report: MissionReport;
  saved: boolean;
  pending?: boolean;
  retryable?: boolean;
  reason?: string;
  transcript?: RunTranscript;
};

const key = (runId: string) => `agronaut:report:${runId}`;

export function readReportSnapshot(runId: string): ReportSnapshot | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(key(runId));
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<ReportSnapshot>;
    if (value.version !== 1 || value.runId !== runId || typeof value.nickname !== "string"
      || !value.score || !Number.isFinite(value.score.total) || !Number.isFinite(value.score.rules)
      || !value.report || !["PASS", "FAIL"].includes(value.report.result)) return undefined;
    return value as ReportSnapshot;
  } catch { return undefined; }
}

export function writeReportSnapshot(snapshot: ReportSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key(snapshot.runId), JSON.stringify(snapshot));
    window.dispatchEvent(new CustomEvent("agronaut:report-updated", { detail: snapshot.runId }));
  } catch { /* A persisted report may still be available from the report route. */ }
}
