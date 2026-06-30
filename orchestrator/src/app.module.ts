import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LazarusConfigModule } from './config/lazarus-config.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [LazarusConfigModule, KafkaModule, IngestionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
