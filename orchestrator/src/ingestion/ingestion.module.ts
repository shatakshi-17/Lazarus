import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { SimulationController } from './simulation.controller';

@Module({
  imports: [KafkaModule],
  controllers: [IngestionController, SimulationController],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
