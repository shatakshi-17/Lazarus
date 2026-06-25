/**
 * Typed accessor keys for ConfigService.get().
 *
 * Using string constants avoids typos like config.get('KAFKA_BROKER') (missing S).
 * Subtask 6 (KafkaProducerService) will inject ConfigService and read these keys.
 */
export const AppConfigKeys = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  HOST: 'HOST',
  KAFKA_BROKERS: 'KAFKA_BROKERS',
  KAFKA_CLIENT_ID: 'KAFKA_CLIENT_ID',
  KAFKA_ANOMALY_TOPIC: 'KAFKA_ANOMALY_TOPIC',
  /**
   * Subtask 8: set true to produce one hardcoded demo anomaly on boot (dev only).
   * Leave false/unset for normal operation.
   */
  LAZARUS_PRODUCE_DEMO_ANOMALY: 'LAZARUS_PRODUCE_DEMO_ANOMALY',
  REDIS_URL: 'REDIS_URL',
  DOCKER_HOST: 'DOCKER_HOST',
} as const;

export type AppConfigKey =
  (typeof AppConfigKeys)[keyof typeof AppConfigKeys];
