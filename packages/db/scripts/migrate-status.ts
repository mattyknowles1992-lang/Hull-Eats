import { spawnSync } from "node:child_process";

import { loadRootEnv, migrationDatabaseUrl, packageDir, prismaCliCommand, prismaSchemaPath } from "./env.js";

loadRootEnv();

const databaseUrl = migrationDatabaseUrl();

const prisma = prismaCliCommand();

const result = spawnSync(
  prisma.command,
  [...prisma.prefixArgs, "migrate", "status", "--schema", prismaSchemaPath],
  {
    cwd: packageDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  },
);

process.exit(result.status === 0 ? 0 : 1);
