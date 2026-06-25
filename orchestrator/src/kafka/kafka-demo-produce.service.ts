/**
 * Env-flagged one-shot Kafka produce (Subtask 8 — no REST API).
 *
 * When LAZARUS_PRODUCE_DEMO_ANOMALY=true in .env (or shell), this service runs once
 * on boot after all modules finish init (KafkaProducerService.connect() completes first).
 * logs partition/offset, then the app continues running (or you Ctrl+C).
 *
 * Normal `npm run start` without the flag does nothing — zero side effects.
 */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigKeys } from '../config/app.config';
import { createDemoAnomalyDto } from './fixtures/demo-anomaly.fixture';
import { KafkaProducerService } from './kafka-producer.service';

@Injectable()
export class KafkaDemoProduceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KafkaDemoProduceService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const shouldProduce = this.configService.get<boolean>(
      AppConfigKeys.LAZARUS_PRODUCE_DEMO_ANOMALY,
      false,
    );

    if (!shouldProduce) {
      return;
    }

    const dto = createDemoAnomalyDto();

    this.logger.log(
      `LAZARUS_PRODUCE_DEMO_ANOMALY=true — producing demo anomaly ${dto.anomaly_id} (source_id=${dto.source_id})`,
    );

    const metadata = await this.kafkaProducerService.produceAnomaly(dto);

    this.logger.log(
      `Demo anomaly produced → topic=${metadata.topicName} partition=${metadata.partition} offset=${metadata.offset}`,
    );
  }
}
