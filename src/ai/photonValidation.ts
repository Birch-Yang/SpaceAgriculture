const runIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const addressPattern = /^(?:\+[1-9]\d{6,14}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export function validMissionRunId(value: unknown): value is string {
  return typeof value === "string" && runIdPattern.test(value);
}

export function normalizeIMessageAddress(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed : trimmed.replace(/[\s().-]/g, "");
}

export function validIMessageAddress(value: string): boolean {
  return value.length <= 254 && addressPattern.test(value);
}
