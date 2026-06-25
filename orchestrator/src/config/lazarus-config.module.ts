import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Monorepo layout — repo-root .env is canonical; orchestrator/.env overrides locally.
      envFilePath: ['.env', '../.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        // Report all invalid/missing keys in one boot failure.
        abortEarly: false,
        allowUnknown: true,
        convert: true,
      },
    }),
  ],
})
export class LazarusConfigModule {}
