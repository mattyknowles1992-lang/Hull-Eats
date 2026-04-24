import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { loadEnv } from "@hull-eats/config";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  process.loadEnvFile?.();

  const env = loadEnv(process.env);
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("v1");

  await app.listen(env.API_PORT);

  const logger = new Logger("Bootstrap");
  logger.log(`API listening on http://localhost:${env.API_PORT}/v1`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
