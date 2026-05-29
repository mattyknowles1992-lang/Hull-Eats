import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@hull-eats/types": path.resolve(rootDir, "packages/types/src"),
      "@hull-eats/auth": path.resolve(rootDir, "packages/auth/src"),
      "@hull-eats/sdk": path.resolve(rootDir, "packages/sdk/src"),
      "@hull-eats/i18n": path.resolve(rootDir, "packages/i18n/src"),
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/merchant-portal/**/*.test.ts"],
    passWithNoTests: false,
  },
});
