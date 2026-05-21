import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadRootEnv, migrationDatabaseUrl, packageDir, prismaCliCommand, prismaSchemaPath } from "./env.js";

/**
 * Compare live Supabase DB → Prisma schema and apply drift SQL (creates missing tables/columns/enums).
 */
loadRootEnv();

const databaseUrl = migrationDatabaseUrl();
const prisma = prismaCliCommand();
const outDir = resolve(packageDir, "scripts/.generated");
const sqlPath = resolve(outDir, "schema-drift.sql");

mkdirSync(outDir, { recursive: true });

console.log("Generating drift SQL (database → schema.prisma)…\n");

const diff = spawnSync(
  prisma.command,
  [
    ...prisma.prefixArgs,
    "migrate",
    "diff",
    "--from-url",
    databaseUrl,
    "--to-schema-datamodel",
    prismaSchemaPath,
    "--script",
    "--output",
    sqlPath,
  ],
  {
    cwd: packageDir,
    encoding: "utf8",
    shell: process.platform === "win32",
  },
);

if (diff.status !== 0) {
  console.error(diff.stdout ?? diff.stderr ?? "migrate diff failed");
  process.exit(diff.status ?? 1);
}

const sql = diff.stdout?.trim() || "";
if (!sql && diff.status === 0) {
  console.log("No drift detected — database already matches schema.prisma.");
  process.exit(0);
}

console.log("Applying drift SQL…\n");

const deploy = spawnSync(
  prisma.command,
  [...prisma.prefixArgs, "db", "execute", "--file", sqlPath, "--schema", prismaSchemaPath],
  {
    cwd: packageDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  },
);

if (deploy.status !== 0) {
  console.error(`\nDrift SQL saved at:\n  ${sqlPath}\n`);
  process.exit(deploy.status ?? 1);
}

console.log("\nDone. Re-run: pnpm db:check\n");
