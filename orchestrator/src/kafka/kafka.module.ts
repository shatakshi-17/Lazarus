/**
 * KafkaModule — Nest wrapper around KafkaProducerService (Plan §6.2 Step 1.4).
 *
 * A Nest Module groups related providers and exports them to other modules.
 * Subtask 7 will add `KafkaModule` to AppModule.imports so the producer connects at boot.
 *
 * Side effect: importing `./kafka-lz4.codec` registers LZ4 with KafkaJS before any produce call.
 */
import { Module } from '@nestjs/common';
import { KafkaDemoProduceService } from './kafka-demo-produce.service';
import { KafkaProducerService } from './kafka-producer.service';
import './kafka-lz4.codec';

@Module({
  providers: [KafkaProducerService, KafkaDemoProduceService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
