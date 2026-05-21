import { PrismaClient } from "@prisma/client";

import { loadRootEnv, migrationDatabaseUrl } from "./env.js";

loadRootEnv();

const prisma = new PrismaClient({
  datasources: { db: { url: migrationDatabaseUrl() } },
});

const rows = await prisma.$queryRaw<Array<{ table_name: string; column_name: string; data_type: string }>>`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'customer_profiles' AND column_name = 'id')
      OR (table_name = 'platform_users' AND column_name = 'id')
      OR (table_name = 'orders' AND column_name = 'delivery_zone_id')
      OR (table_name = 'DeliveryZone' AND column_name = 'id')
    )
  ORDER BY table_name, column_name
`;

console.log(rows);

await prisma.$disconnect();
