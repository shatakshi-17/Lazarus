import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LazarusConfigModule } from './config/lazarus-config.module';
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [LazarusConfigModule, KafkaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
