import { spawnSync } from "node:child_process";

import { loadRootEnv, migrationDatabaseUrl, packageDir, prismaCliCommand, prismaSchemaPath } from "./env.js";

loadRootEnv();

const databaseUrl = migrationDatabaseUrl();

console.log("Applying Prisma migrations (migrate deploy)…\n");

const prisma = prismaCliCommand();

const result = spawnSync(
  prisma.command,
  [...prisma.prefixArgs, "migrate", "deploy", "--schema", prismaSchemaPath],
  {
    cwd: packageDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  },
);

process.exit(result.status === 0 ? 0 : 1);
