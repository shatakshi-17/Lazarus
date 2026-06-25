import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppConfigKeys } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>(AppConfigKeys.PORT, 3001);
  const host = configService.get<string>(AppConfigKeys.HOST, '0.0.0.0');

  // Never bind to an alternate port on EADDRINUSE — operator must free configured PORT explicitly.
  await app.listen(port, host);
}

bootstrap();
