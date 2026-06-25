/**
 * Joi validation schema for orchestrator environment variables.
 *
 * Joi runs when the app STARTS (via ConfigModule). If any required variable
 * is missing or malformed, Nest exits immediately with a readable error —
 * better than connecting to the wrong Kafka broker mid-request.
 *
 * Master Plan §6.2 Step 1.3 required keys:
 *   KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_ANOMALY_TOPIC,
 *   REDIS_URL, PORT, DOCKER_HOST
 */
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  /**
   * Node environment label — affects logging verbosity in later phases.
   * "development" is normal for local work on your laptop.
   */
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  /**
   * HTTP port the orchestrator listens on.
   * Plan default: 3001 (avoids clashing with Grafana on host port 3000).
   */
  PORT: Joi.number().port().default(3001),

  /**
   * Network address where NestJS host binds (0.0.0.0 = all interfaces).
   * Useful inside Docker; optional for local dev.
   */
  HOST: Joi.string().default('0.0.0.0'),

  /**
   * Comma-separated Kafka broker list.
   * - Nest on laptop (outside Docker): use localhost:9092
   * - Nest inside Compose on lazarus-mesh: use kafka:9092
   */
  KAFKA_BROKERS: Joi.string().required(),

  /** Client ID sent to Kafka — appears in broker logs for debugging. */
  KAFKA_CLIENT_ID: Joi.string().required(),

  /** Topic name for anomaly ingestion (Plan §5.2). */
  KAFKA_ANOMALY_TOPIC: Joi.string().required(),

  /**
   * Subtask 8 — one-shot demo produce on boot when true.
   * PowerShell: $env:LAZARUS_PRODUCE_DEMO_ANOMALY='true'; npm run start
   */
  LAZARUS_PRODUCE_DEMO_ANOMALY: Joi.boolean()
    .truthy('true', '1', 'yes')
    .falsy('false', '0', 'no', '')
    .default(false),

  /**
   * Redis connection URL (Valkey-compatible Streams bus in later phases).
   * Example: redis://localhost:6379 when Redis runs via Docker port mapping.
   */
  REDIS_URL: Joi.string()
    .pattern(/^redis(s)?:\/\/.+/i)
    .required()
    .messages({
      'string.pattern.base':
        'REDIS_URL must be a redis:// or rediss:// URI (e.g. redis://localhost:6379)',
    }),

  /**
   * Docker daemon socket path for sandbox worker (Phase 3).
   * Validated now so misconfiguration is caught early even before sandbox code exists.
   */
  DOCKER_HOST: Joi.string().required(),
});
