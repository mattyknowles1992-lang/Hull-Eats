import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const appDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = join(appDir, "../../.env");

if (existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(rootEnvPath);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hull-eats/ui", "@hull-eats/types", "@hull-eats/i18n", "@hull-eats/sdk"],
};

export default nextConfig;
