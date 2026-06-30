import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3001),

  HOST: Joi.string().default('0.0.0.0'),

  KAFKA_BROKERS: Joi.string().required(),

  KAFKA_CLIENT_ID: Joi.string().required(),

  KAFKA_ANOMALY_TOPIC: Joi.string().required(),

  LAZARUS_PRODUCE_DEMO_ANOMALY: Joi.boolean()
    .truthy('true', '1', 'yes')
    .falsy('false', '0', 'no', '')
    .default(false),

  REDIS_URL: Joi.string()
    .pattern(/^redis(s)?:\/\/.+/i)
    .required()
    .messages({
      'string.pattern.base':
        'REDIS_URL must be a redis:// or rediss:// URI (e.g. redis://localhost:6379)',
    }),

  DOCKER_HOST: Joi.string().required(),
});
