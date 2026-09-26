const storageKey = "agronaut:last-saved-run:v1";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The latest saved run on this browser is a convenience, not an account identity. */
export function readLastSavedRun(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.localStorage.getItem(storageKey);
    return value && uuid.test(value) ? value : undefined;
  } catch { return undefined; }
}

export function writeLastSavedRun(runId: string): void {
  if (typeof window === "undefined" || !uuid.test(runId)) return;
  try { window.localStorage.setItem(storageKey, runId); }
  catch { /* Browsers may disable storage; public records still work. */ }
}
