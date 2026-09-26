import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySpectrumWebhook(rawBody: string, headers: Headers, secret: string, now = Date.now()): boolean {
  const timestamp = headers.get("x-spectrum-timestamp");
  const signature = headers.get("x-spectrum-signature");
  if (!timestamp || !/^\d{10}$/.test(timestamp) || !signature || !/^v0=[0-9a-f]{64}$/i.test(signature)) return false;
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest();
  const actual = Buffer.from(signature.slice(3), "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
