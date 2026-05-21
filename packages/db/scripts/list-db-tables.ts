import { PrismaClient } from "@prisma/client";

import { loadRootEnv, migrationDatabaseUrl } from "./env.js";

loadRootEnv();

const prisma = new PrismaClient({
  datasources: { db: { url: migrationDatabaseUrl() } },
});

async function main() {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  console.log(rows.map((r) => r.table_name).join("\n"));
  console.log(`\nTotal: ${rows.length} tables`);
}

main()
  .finally(() => prisma.$disconnect());
