import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// One .env at the repo root serves the web app, the worker, and the migration CLI.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvConfig(root, process.env.NODE_ENV !== "production", undefined, true);

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  turbopack: { root },
  poweredByHeader: false,
};

export default nextConfig;
