import { createServices, type RelayServices } from "@relayos/domain";
import { loadEnv } from "@relayos/shared";

const g = globalThis as { __relayServices?: RelayServices };

/** Process-wide services (one DB pool), reused across hot reloads in development. */
export function services(): RelayServices {
  g.__relayServices ??= createServices(loadEnv());
  return g.__relayServices;
}
