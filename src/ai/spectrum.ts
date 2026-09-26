import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { photonCredentials } from "./photonConfig.ts";
export { photonConfigured } from "./photonConfig.ts";

type SpectrumApp = Awaited<ReturnType<typeof Spectrum>>;
let appPromise: Promise<SpectrumApp> | undefined;

async function app(): Promise<SpectrumApp> {
  const { projectId, projectSecret } = photonCredentials();
  if (!projectId || !projectSecret) throw new Error("Photon Spectrum is not configured");
  if (!appPromise) appPromise = Spectrum({ projectId, projectSecret, providers: [imessage.config()] })
    .catch((error) => { appPromise = undefined; throw error; });
  return appPromise;
}

export async function startIMessage(address: string): Promise<{ spaceId: string; phone?: string }> {
  const provider = imessage(await app());
  const user = await provider.user(address);
  const space = await provider.space.create(user);
  return { spaceId: space.id, phone: space.phone };
}

export async function sendIMessage(spaceId: string, text: string, phone?: string): Promise<void> {
  const provider = imessage(await app());
  const space = await provider.space.get(spaceId, phone ? { phone } : undefined);
  await space.send(text);
}
