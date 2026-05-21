import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { loadRootEnv, migrationDatabaseUrl, packageDir, prismaCliCommand, prismaSchemaPath } from "./env.js";

/**
 * For databases that already have tables but no Prisma migration history (P3005).
 * Marks older migrations as applied, then runs migrate deploy for anything left (e.g. viewer role).
 */
loadRootEnv();

const databaseUrl = migrationDatabaseUrl();
const prisma = prismaCliCommand();

function runPrisma(args: string[]) {
  return spawnSync(prisma.command, [...prisma.prefixArgs, ...args], {
    cwd: packageDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

const migrationsDir = join(packageDir, "prisma/migrations");
const migrationNames = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const viewerMigration = "20260520120000_hub_membership_viewer";
const toBaseline = migrationNames.filter((name) => name !== viewerMigration);

console.log("Baselining existing schema (marking prior migrations as applied)…\n");

for (const name of toBaseline) {
  console.log(`  resolve --applied ${name}`);
  const result = runPrisma(["migrate", "resolve", "--applied", name, "--schema", prismaSchemaPath]);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nApplying remaining migrations…\n");

const deploy = runPrisma(["migrate", "deploy", "--schema", prismaSchemaPath]);
process.exit(deploy.status === 0 ? 0 : 1);
