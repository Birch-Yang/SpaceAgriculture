import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

type SpectrumApp = Awaited<ReturnType<typeof Spectrum>>;
let appPromise: Promise<SpectrumApp> | undefined;

export function photonConfigured(): boolean {
  return !!(process.env.SPECTRUM_PROJECT_ID || process.env.PHOTON_PROJECT_ID)
    && !!process.env.SPECTRUM_PROJECT_SECRET;
}

async function app(): Promise<SpectrumApp> {
  const projectId = process.env.SPECTRUM_PROJECT_ID || process.env.PHOTON_PROJECT_ID;
  const projectSecret = process.env.SPECTRUM_PROJECT_SECRET;
  if (!projectId || !projectSecret) throw new Error("Photon Spectrum is not configured");
  if (!appPromise) appPromise = Spectrum({ projectId, projectSecret, providers: [imessage.config()] })
    .catch((error) => { appPromise = undefined; throw error; });
  return appPromise;
}

export async function startIMessage(address: string): Promise<{ spaceId: string; phone?: string }> {
  const provider = imessage(await app());
  const user = await provider.user(address);
  // Spectrum 12.10 resolves newly entered users by ID only; service is usually absent.
  if (user.service === "SMS" || user.service === "RCS") throw new Error("This address is not reachable through iMessage");
  const space = await provider.space.create(user);
  return { spaceId: space.id, phone: space.phone };
}

export async function sendIMessage(spaceId: string, text: string, phone?: string): Promise<void> {
  const provider = imessage(await app());
  const space = await provider.space.get(spaceId, phone ? { phone } : undefined);
  await space.send(text);
}
