/**
 * KafkaProducerService — sends IngestAnomalyDto messages to Kafka (Plan §6.2 Step 1.4).
 *
 * Nest "service" = injectable class with business logic. This one owns the kafkajs
 * Producer client: connect on module init, disconnect on shutdown, expose produceAnomaly().
 *
 * Config (brokers, client id, topic) comes from ConfigService — same keys validated
 * in Subtask 4 (Joi). Subtask 7 imports KafkaModule into AppModule so this lifecycle runs.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CompressionTypes,
  Kafka,
  Producer,
  RecordMetadata,
} from 'kafkajs';
import { AppConfigKeys } from '../config/app.config';
import { IngestAnomalyDto } from '../common/dto/ingest-anomaly.dto';
import './kafka-lz4.codec';

/** kafkajs acks: -1 = wait for all in-sync replicas ("all" in Kafka docs). */
const PRODUCER_ACKS_ALL = -1;

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka!: Kafka;
  private producer!: Producer;
  private anomalyTopic!: string;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Nest lifecycle hook — runs when KafkaModule is loaded (Subtask 7 wiring).
   * Connects the producer so produceAnomaly() is ready.
   */
  async onModuleInit(): Promise<void> {
    const brokersRaw = this.configService.get<string>(
      AppConfigKeys.KAFKA_BROKERS,
    );
    const clientId = this.configService.get<string>(
      AppConfigKeys.KAFKA_CLIENT_ID,
    );
    const topic = this.configService.get<string>(
      AppConfigKeys.KAFKA_ANOMALY_TOPIC,
    );

    if (!brokersRaw || !clientId || !topic) {
      throw new Error(
        'Kafka producer config missing — check KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_ANOMALY_TOPIC in .env',
      );
    }

    const brokers = brokersRaw
      .split(',')
      .map((broker) => broker.trim())
      .filter((broker) => broker.length > 0);

    if (brokers.length === 0) {
      throw new Error(
        `KAFKA_BROKERS parsed to an empty list (raw value: "${brokersRaw}")`,
      );
    }

    this.anomalyTopic = topic;

    this.kafka = new Kafka({
      clientId,
      brokers,
      // Retry broker connection/metadata requests — distinct from produce retries below.
      retry: { retries: 5 },
    });

    /**
     * Producer settings (Plan §6.2 Step 1.4):
     * - retry.retries: 5 — resend on transient broker errors
     * - allowAutoTopicCreation: true — dev single-node creates infrastructure-anomalies on first produce
     *
     * acks & compression are set per send() call in produceAnomaly().
     */
    this.producer = this.kafka.producer({
      retry: { retries: 5 },
      allowAutoTopicCreation: true,
    });

    await this.producer.connect();
    this.logger.log(
      `Kafka producer connected (brokers=${brokers.join(', ')}, topic=${topic})`,
    );
  }

  /** Clean shutdown — disconnect producer when Nest app stops (Ctrl+C). */
  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    }
  }

  /**
   * Publish one anomaly to KAFKA_ANOMALY_TOPIC (default: infrastructure-anomalies).
   *
   * - Partition key: dto.source_id (Plan §5.2 — ordered processing per source)
   * - Value: JSON-serialized IngestAnomalyDto
   * - Headers: anomaly_type, severity, trace_id (trace_id = anomaly_id for correlation)
   *
   * acks: -1 ("all") — durable on multi-replica clusters. On Lazarus single-node KRaft dev,
   * only one broker exists, so acks: 1 would behave similarly with slightly lower latency;
   * we use -1 to match production intent on the KVM2 VPS.
   */
  async produceAnomaly(dto: IngestAnomalyDto): Promise<RecordMetadata> {
    const [metadata] = await this.producer.send({
      topic: this.anomalyTopic,
      acks: PRODUCER_ACKS_ALL,
      compression: CompressionTypes.LZ4,
      messages: [
        {
          key: dto.source_id,
          value: JSON.stringify(dto),
          headers: {
            anomaly_type: dto.anomaly_type,
            severity: dto.severity,
            // Plan §5.2 headers include trace_id; §5.1 DTO uses anomaly_id — reuse for trace correlation.
            trace_id: dto.anomaly_id,
          },
        },
      ],
    });

    return metadata;
  }
}
