import "reflect-metadata";

import { Logger, RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import express from "express";
import { ZodError } from "zod";

import { loadEnv, loadMonorepoEnvFile } from "@hull-eats/config";

import { AppModule } from "./app.module";
import { ZodValidationFilter } from "./common/zod-validation.filter";

/** Default Express JSON limit (100kb) is too small for full hub workspace saves (menu + settings). */
const API_BODY_LIMIT = "5mb";

function logBootstrapFailure(error: unknown): void {
  if (error instanceof ZodError) {
    console.error("Invalid environment configuration:");
    console.error(JSON.stringify(error.issues, null, 2));
    return;
  }

  if (error instanceof Error) {
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    return;
  }

  console.error(String(error));
}

async function bootstrap(): Promise<void> {
  loadMonorepoEnvFile();

  const env = loadEnv(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: false,
  });
  app.use(express.json({ limit: API_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: API_BODY_LIMIT }));
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
  logBootstrapFailure(error);
  process.exit(1);
});
