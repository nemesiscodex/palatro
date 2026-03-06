import { env } from "@palatro/env/web";

const DEFAULT_SITE_URL = "https://palatro.nemesiscodex.org";

export function getSiteUrl() {
  return (env.VITE_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, "");
}
