import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const repoRoot = resolve(packageRoot, "../..");

export const prismaSchemaPath = resolve(packageRoot, "prisma/schema.prisma");

export const packageDir = packageRoot;

export function prismaCliCommand(): { command: string; prefixArgs: string[] } {
  const winBin = resolve(packageRoot, "node_modules/.bin/prisma.cmd");
  const posixBin = resolve(packageRoot, "node_modules/.bin/prisma");

  if (existsSync(winBin)) {
    return { command: winBin, prefixArgs: [] };
  }

  if (existsSync(posixBin)) {
    return { command: posixBin, prefixArgs: [] };
  }

  return { command: process.execPath, prefixArgs: [resolve(packageRoot, "node_modules/prisma/build/index.js")] };
}

/** Load Hull_Eats/.env into process.env (repo root, not packages/db). */
export function loadRootEnv(): void {
  const envPath = resolve(repoRoot, ".env");

  if (!existsSync(envPath)) {
    throw new Error(
      `Missing ${envPath}\nCopy .env.example to .env and set DATABASE_URL (and DATABASE_URL_DIRECT for migrations).`,
    );
  }

  const content = readFileSync(envPath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

/** URL for prisma migrate * — prefers direct Supabase connection when set. */
export function migrationDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL_DIRECT?.trim();
  if (direct) {
    return direct;
  }

  const pooled = process.env.DATABASE_URL?.trim();
  if (!pooled) {
    throw new Error("DATABASE_URL is not set in .env");
  }

  if (pooled.includes("pgbouncer=true") || pooled.includes(":6543/")) {
    console.warn(
      "\n⚠️  DATABASE_URL uses the Supabase pooler. prisma migrate may hang or fail.\n" +
        "   Add DATABASE_URL_DIRECT to .env (Supabase → Database → URI, direct / port 5432).\n",
    );
  }

  return pooled;
}

/** URL for app runtime checks (same as API — usually pooler). */
export function appDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set in .env");
  }
  return url;
}
