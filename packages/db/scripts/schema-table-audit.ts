import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadRootEnv, migrationDatabaseUrl, packageDir } from "./env.js";

loadRootEnv();

const schemaPath = resolve(packageDir, "prisma/schema.prisma");
const schema = readFileSync(schemaPath, "utf8");

const expectedTables = new Set<string>();
for (const match of schema.matchAll(/@@map\("([^"]+)"\)/g)) {
  expectedTables.add(match[1]!);
}

// Models without @@map use default snake_case plural — Prisma convention; this repo maps explicitly.
for (const match of schema.matchAll(/^model\s+(\w+)/gm)) {
  const model = match[1]!;
  const block = schema.slice(match.index ?? 0, (match.index ?? 0) + 800);
  if (!block.includes(`@@map(`)) {
    expectedTables.add(
      model
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
        .toLowerCase() + "s",
    );
  }
}

const prisma = new PrismaClient({
  datasources: { db: { url: migrationDatabaseUrl() } },
});

async function main() {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  const actual = new Set(rows.map((row) => row.table_name));
  const missing = [...expectedTables].filter((name) => !actual.has(name)).sort();
  const extra = [...actual].filter((name) => !expectedTables.has(name) && name !== "_prisma_migrations").sort();

  console.log(`Expected tables (from schema @@map): ${expectedTables.size}`);
  console.log(`Actual public tables: ${actual.size}`);
  console.log("");

  if (missing.length === 0 && extra.length === 0) {
    console.log("All mapped schema tables exist in Supabase; no unexpected extra tables.");
    return;
  }

  if (missing.length > 0) {
    console.log("Missing in database:");
    for (const name of missing) {
      console.log(`  - ${name}`);
    }
  }

  if (extra.length > 0) {
    console.log("Extra in database (not in Prisma @@map list):");
    for (const name of extra) {
      console.log(`  - ${name}`);
    }
  }

  process.exit(missing.length > 0 ? 1 : 0);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
