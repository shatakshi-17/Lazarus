import { Kafka, EachMessagePayload } from 'kafkajs';
import {
  DEMO_ANOMALY_ID,
  DEMO_SOURCE_ID,
} from '../src/kafka/fixtures/demo-anomaly.fixture';
import '../src/kafka/kafka-lz4.codec';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean);

const topic =
  process.env.KAFKA_ANOMALY_TOPIC ?? 'infrastructure-anomalies';

const TIMEOUT_MS = 20_000;

function headerValue(
  headers: EachMessagePayload['message']['headers'],
  name: string,
): string | undefined {
  const raw = headers?.[name];
  if (raw === undefined) {
    return undefined;
  }
  if (Buffer.isBuffer(raw)) {
    return raw.toString('utf8');
  }
  if (Array.isArray(raw)) {
    const first = raw[0];
    return Buffer.isBuffer(first) ? first.toString('utf8') : String(first);
  }
  return String(raw);
}

function assertDemoMessage(payload: EachMessagePayload): void {
  const { message, partition } = payload;
  const key = message.key?.toString('utf8');

  if (key !== DEMO_SOURCE_ID) {
    return;
  }

  const bodyRaw = message.value?.toString('utf8');
  if (!bodyRaw) {
    throw new Error('Demo message has empty value');
  }

  const body = JSON.parse(bodyRaw) as Record<string, unknown>;

  const checks: Array<[string, boolean]> = [
    ['key === source_id', key === DEMO_SOURCE_ID],
    ['body.anomaly_id', body.anomaly_id === DEMO_ANOMALY_ID],
    ['body.source_id', body.source_id === DEMO_SOURCE_ID],
    ['body.anomaly_type', body.anomaly_type === 'cpu_spike'],
    ['body.severity', body.severity === 'medium'],
    ['body.metrics object', typeof body.metrics === 'object' && body.metrics !== null],
    [
      'header anomaly_type',
      headerValue(message.headers, 'anomaly_type') === 'cpu_spike',
    ],
    [
      'header severity',
      headerValue(message.headers, 'severity') === 'medium',
    ],
    [
      'header trace_id',
      headerValue(message.headers, 'trace_id') === DEMO_ANOMALY_ID,
    ],
  ];

  const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);
  if (failed.length > 0) {
    throw new Error(`Verification failed: ${failed.join(', ')}`);
  }

  console.log('Subtask 9 verification PASSED');
  console.log(`  topic:     ${topic}`);
  console.log(`  partition: ${partition}`);
  console.log(`  offset:    ${message.offset}`);
  console.log(`  key:       ${key}`);
  console.log(`  headers:   anomaly_type=cpu_spike severity=medium trace_id=${DEMO_ANOMALY_ID}`);
  console.log(`  body:      ${bodyRaw.slice(0, 120)}...`);
}

async function main(): Promise<void> {
  const kafka = new Kafka({
    clientId: 'lazarus-subtask-9-verify',
    brokers,
  });

  const consumer = kafka.consumer({
    groupId: `lazarus-subtask-9-verify-${Date.now()}`,
  });

  let verified = false;
  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const timer = setTimeout(() => {
    if (!verified) {
      console.error(
        `TIMEOUT: no message with key "${DEMO_SOURCE_ID}" on topic "${topic}" within ${TIMEOUT_MS}ms`,
      );
      console.error(
        'Hint: run produce first — $env:LAZARUS_PRODUCE_DEMO_ANOMALY=\'true\'; npm run start',
      );
      process.exit(1);
    }
  }, TIMEOUT_MS);

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async (payload) => {
      if (verified) {
        return;
      }
      try {
        if (payload.message.key?.toString('utf8') !== DEMO_SOURCE_ID) {
          return;
        }
        assertDemoMessage(payload);
        verified = true;
        clearTimeout(timer);
        await consumer.stop();
        await consumer.disconnect();
        resolveDone();
      } catch (err) {
        clearTimeout(timer);
        await consumer.stop();
        await consumer.disconnect();
        throw err;
      }
    },
  });

  await done;
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
