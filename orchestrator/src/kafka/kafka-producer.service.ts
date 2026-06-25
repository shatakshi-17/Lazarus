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

// acks -1 — production durability intent on KVM2; dev single-broker would behave similarly at acks 1.
const PRODUCER_ACKS_ALL = -1;

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka!: Kafka;
  private producer!: Producer;
  private anomalyTopic!: string;

  constructor(private readonly configService: ConfigService) {}

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
      // Broker connection retry — separate failure domain from produce-level retry below.
      retry: { retries: 5 },
    });

    this.producer = this.kafka.producer({
      retry: { retries: 5 },
      // Single-node dev — topic materializes on first produce; prod should pre-create topics.
      allowAutoTopicCreation: true,
    });

    await this.producer.connect();
    this.logger.log(
      `Kafka producer connected (brokers=${brokers.join(', ')}, topic=${topic})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.logger.log('Kafka producer disconnected');
    }
  }

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
            // §5.1 DTO has no trace_id field; §5.2 header contract maps anomaly_id → trace_id.
            trace_id: dto.anomaly_id,
          },
        },
      ],
    });

    return metadata;
  }
}
