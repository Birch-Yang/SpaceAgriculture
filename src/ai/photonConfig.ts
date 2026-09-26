export function photonCredentials(env: Record<string, string | undefined> = process.env) {
  return {
    projectId: (env.PHOTON_PROJECT_ID || env.SPECTRUM_PROJECT_ID || "").trim(),
    // PHOTON_API_KEY is this repo's name for the Spectrum project SECRET_KEY.
    projectSecret: (env.PHOTON_API_KEY || env.SPECTRUM_PROJECT_SECRET || "").trim(),
    webhookSecret: (env.PHOTON_WEBHOOK_SECRET || env.SPECTRUM_WEBHOOK_SECRET || "").trim(),
  };
}

export function photonConfigured(): boolean {
  const { projectId, projectSecret } = photonCredentials();
  return !!projectId && !!projectSecret;
}
