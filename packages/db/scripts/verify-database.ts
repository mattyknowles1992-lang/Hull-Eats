import { spawnSync } from "node:child_process";

import { Prisma, PrismaClient } from "@prisma/client";

import { appDatabaseUrl, loadRootEnv, migrationDatabaseUrl, packageDir, prismaCliCommand, prismaSchemaPath } from "./env.js";

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
};

const REQUIRED_TABLES = [
  "businesses",
  "stores",
  "hub_users",
  "menu_categories",
  "menu_items",
  "store_promotions",
  "store_courier_assignments",
  "hub_config_snapshots",
  "store_hours",
  "orders",
  "service_categories",
  "service_businesses",
  "service_listings",
  "resale_listings",
  "resale_conversations",
  "resale_messages",
  "resale_offers",
  "resale_purchases",
  "resale_reviews",
  "resale_resolution_cases",
  "DeliveryZone",
  "MediaAsset",
  "MerchantMembership",
  "MenuItemAvailability",
] as const;

function runChecks(): CheckResult[] {
  const results: CheckResult[] = [];

  results.push({
    name: ".env loaded",
    ok: Boolean(process.env.DATABASE_URL?.trim()),
    detail: process.env.DATABASE_URL?.trim()
      ? "DATABASE_URL is set"
      : "Add DATABASE_URL to Hull_Eats/.env",
  });

  results.push({
    name: "Migration URL",
    ok: Boolean(migrationDatabaseUrl()),
    detail: process.env.DATABASE_URL_DIRECT?.trim()
      ? "Using DATABASE_URL_DIRECT for migrate status"
      : process.env.DATABASE_URL?.includes(":6543")
        ? "Using pooler URL — set DATABASE_URL_DIRECT for reliable migrate"
        : "Using DATABASE_URL",
  });

  const prisma = prismaCliCommand();

  const status = spawnSync(
    prisma.command,
    [...prisma.prefixArgs, "migrate", "status", "--schema", prismaSchemaPath],
    {
      cwd: packageDir,
      encoding: "utf8",
      shell: process.platform === "win32",
      env: { ...process.env, DATABASE_URL: migrationDatabaseUrl() },
    },
  );

  const statusText = `${status.stdout ?? ""}\n${status.stderr ?? ""}`;
  const pending =
    statusText.includes("not yet been applied") ||
    statusText.includes("following migrations have failed") ||
    status.status !== 0;

  results.push({
    name: "Prisma migrations",
    ok: !pending && status.status === 0,
    detail: pending
      ? "Pending or failed migrations — run: pnpm db:deploy"
      : "Database schema matches migration history",
  });

  return results;
}

async function runDatabaseChecks(results: CheckResult[]) {
  const prisma = new PrismaClient({
    datasources: { db: { url: appDatabaseUrl() } },
  });

  try {
    const migrationTable = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      ) AS "exists"
    `;

    results.push({
      name: "Migration history table",
      ok: migrationTable[0]?.exists === true,
      detail: migrationTable[0]?.exists
        ? "_prisma_migrations exists"
        : "Run pnpm db:deploy once to initialise Prisma on this database",
    });

    const tableRows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (${Prisma.join([...REQUIRED_TABLES])})
      ORDER BY table_name
    `;

    const found = new Set(tableRows.map((row) => row.table_name));
    const missing = REQUIRED_TABLES.filter((name) => !found.has(name));

    results.push({
      name: "Core tables",
      ok: missing.length === 0,
      detail:
        missing.length === 0
          ? `All ${REQUIRED_TABLES.length} checked tables present`
          : `Missing: ${missing.join(", ")} — run pnpm db:deploy`,
    });

    const viewerRole = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'membership_role'
          AND e.enumlabel = 'viewer'
      ) AS "exists"
    `;

    results.push({
      name: "Hub viewer role",
      ok: viewerRole[0]?.exists === true,
      detail: viewerRole[0]?.exists
        ? "membership_role includes viewer (view-only hub users)"
        : 'Missing — run in Supabase SQL: ALTER TYPE "membership_role" ADD VALUE IF NOT EXISTS \'viewer\';',
    });

    const menuItemColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'menu_items'
        AND column_name IN ('requires_id_verification', 'image_url', 'is_active')
    `;

    const columnNames = new Set(menuItemColumns.map((row) => row.column_name));

    results.push({
      name: "Menu item columns",
      ok: columnNames.has("is_active") && columnNames.has("image_url"),
      detail: `Found: ${[...columnNames].join(", ") || "none"}`,
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  loadRootEnv();

  console.log("\nHull Eats database check\n");

  const results = runChecks();
  await runDatabaseChecks(results);

  let failed = 0;

  for (const check of results) {
    const icon = check.ok ? "✓" : "✗";
    console.log(`${icon} ${check.name}`);
    console.log(`  ${check.detail}`);
    if (!check.ok) {
      failed += 1;
    }
  }

  console.log("");

  if (failed > 0) {
    console.log(`${failed} check(s) failed. Fix with:\n  pnpm db:deploy\n  pnpm db:check\n`);
    process.exit(1);
  }

  console.log("All checks passed.\n");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
