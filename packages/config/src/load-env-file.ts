import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/** Walk up from `startDir` and load the first `.env` found (monorepo root). */
export function loadMonorepoEnvFile(startDir = process.cwd()): string | null {
  let dir = startDir;

  for (let depth = 0; depth < 8; depth += 1) {
    const envPath = join(dir, ".env");

    if (existsSync(envPath)) {
      if (typeof process.loadEnvFile === "function") {
        process.loadEnvFile(envPath);
      }

      return envPath;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }

    dir = parent;
  }

  return null;
}
