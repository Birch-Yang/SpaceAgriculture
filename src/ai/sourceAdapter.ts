import type { ScientificSource } from "./schemas.ts";
import { curatedSources } from "../content/sources.ts";

// The content team maintains the checked source list. Reports receive this allowlist only.
export const verifiedSources: readonly ScientificSource[] = curatedSources.filter((source) =>
  /^[a-z0-9-]+$/.test(source.id) && /^https:\/\//.test(source.url));
