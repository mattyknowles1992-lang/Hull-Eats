import "reflect-metadata";

import { existsSync } from "node:fs";

import { Logger, RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { loadEnv } from "@hull-eats/config";

import { AppModule } from "./app.module";
import { ZodValidationFilter } from "./common/zod-validation.filter";

async function bootstrap(): Promise<void> {
  if (existsSync(".env")) {
    process.loadEnvFile?.();
  }

  const env = loadEnv(process.env);
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalFilters(new ZodValidationFilter());
  app.setGlobalPrefix("v1", {
    exclude: [
      { path: "/", method: RequestMethod.GET },
      { path: "favicon.ico", method: RequestMethod.GET },
    ],
  });

  await app.listen(env.API_PORT);

  const logger = new Logger("Bootstrap");
  logger.log(`API listening on http://localhost:${env.API_PORT} (root) and /v1`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
