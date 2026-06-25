import { Module } from '@nestjs/common';
import { KafkaDemoProduceService } from './kafka-demo-produce.service';
import { KafkaProducerService } from './kafka-producer.service';
import './kafka-lz4.codec';

@Module({
  providers: [KafkaProducerService, KafkaDemoProduceService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
