/**
 * Lazarus Orchestrator — application entry point.
 *
 * This file is the first code that runs when you start the service
 * (e.g. `npm run start:dev` inside the orchestrator folder).
 *
 * Subtask 4: reads PORT from validated ConfigService (Plan default 3001).
 * Subtask 6: Kafka producer wiring will also use ConfigService for broker URLs.
 */
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppConfigKeys } from './config/app.config';

/**
 * Bootstraps the NestJS application.
 *
 * "Bootstrap" means: build the app from AppModule, then start the HTTP server.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // ConfigService is available because LazarusConfigModule is global (Subtask 4).
  // Values were already validated by Joi during module initialization.
  const configService = app.get(ConfigService);
  const port = configService.get<number>(AppConfigKeys.PORT, 3001);
  const host = configService.get<string>(AppConfigKeys.HOST, '0.0.0.0');

  // Lazarus port policy: always bind to configured PORT (Plan: 3001).
  // If listen fails with EADDRINUSE, stop the other process on that port —
  // do NOT change PORT to a random free port.
  await app.listen(port, host);
}

bootstrap();
