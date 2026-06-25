/**
 * Lazarus ConfigModule wrapper — loads .env and validates with Joi.
 *
 * isGlobal: true  → any service can inject ConfigService without re-importing.
 * envFilePath     → monorepo layout: try orchestrator/.env first, then repo root ../.env
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // When you run `npm run start:dev` from orchestrator/, cwd is orchestrator/.
      // Lazarus keeps the canonical .env at repo root (see root .env.example).
      envFilePath: ['.env', '../.env'],
      validationSchema: envValidationSchema,
      // Surface all validation errors at once (not just the first missing key).
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
        // Coerce string env values (e.g. PORT="3001") to numbers/booleans for Joi.
        convert: true,
      },
    }),
  ],
})
export class LazarusConfigModule {}
