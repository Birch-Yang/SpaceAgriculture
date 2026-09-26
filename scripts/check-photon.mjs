import { photonCredentials } from "../src/ai/photonConfig.ts";

// Read-only diagnostics. Never print credentials, addresses, or response bodies.
const { projectId, projectSecret, webhookSecret } = photonCredentials();
let failures = 0;
function check(condition, message) {
  console.log(`${condition ? "OK" : "NEEDED"}: ${message}`);
  if (!condition) failures++;
}
check(!!projectId, "PHOTON_PROJECT_ID (Spectrum project ID)");
check(!!projectSecret, "PHOTON_API_KEY (Spectrum project SECRET_KEY)");
check(!!webhookSecret, "PHOTON_WEBHOOK_SECRET (webhook signing secret)");
check((process.env.MISSION_SESSION_SECRET?.length ?? 0) >= 32, "MISSION_SESSION_SECRET (at least 32 characters)");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
check(!!url && !!serviceKey, "Supabase server URL and service-role key for session storage");
const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
let webhookUrl;
try {
  const appUrl = new URL(appOrigin);
  if (appUrl.protocol === "https:" && appUrl.pathname === "/" && !appUrl.search && !appUrl.hash
    && !appUrl.username && !appUrl.password && appUrl.hostname.includes(".")
    && !/^(?:your-|example\.|localhost$)/i.test(appUrl.hostname))
    webhookUrl = new URL("/api/mission-control/webhook", appUrl).href;
} catch { /* Missing or invalid deployment URL. */ }
check(!!webhookUrl, "NEXT_PUBLIC_APP_URL is your real public HTTPS deployment origin");

if (projectId && projectSecret) {
  try {
    const response = await fetch(`https://spectrum.photon.codes/projects/${encodeURIComponent(projectId)}/webhooks/`, {
      headers: { Authorization: `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString("base64")}` },
      signal: AbortSignal.timeout(15000), redirect: "error",
    });
    check(response.ok, `Photon authentication (HTTP ${response.status})`);
    if (response.ok) {
      const payload = await response.json();
      const webhooks = Array.isArray(payload.data) ? payload.data : [];
      check(!!webhookUrl && webhooks.some((hook) => hook.webhookUrl === webhookUrl),
        "Registered /api/mission-control/webhook endpoint matches this deployment");
      if (webhookUrl && webhooks.some((hook) => hook.webhookUrl === webhookUrl)) {
        try {
          const endpoint = await fetch(webhookUrl, { redirect: "manual", signal: AbortSignal.timeout(10000) });
          check(endpoint.status === 405, `Public webhook route is reachable without login or redirect (HTTP ${endpoint.status})`);
        } catch { check(false, "Public webhook route could not be reached"); }
      }
    }
  } catch { check(false, "Photon endpoint could not be reached; check connectivity and the project credentials"); }
}

if (url && serviceKey) {
  for (const table of ["mission_control_sessions", "mission_control_enrollments", "mission_control_webhook_messages", "photon_advice_usage"]) {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?select=*&limit=0`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, signal: AbortSignal.timeout(10000), redirect: "error",
      });
      check(response.ok, `${table} is accessible (HTTP ${response.status})`);
    } catch { check(false, `${table} could not be reached`); }
  }
}
console.log("This check sends no messages. It does not prove recipient delivery, webhook reachability/signing, or SQL function behavior.");
process.exitCode = failures ? 1 : 0;
