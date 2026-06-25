/**
 * Root module for the Lazarus orchestrator (NestJS control plane).
 *
 * Think of a Nest "Module" as a box that lists:
 *   - controllers  → handle HTTP routes
 *   - providers    → services / shared logic (dependency injection)
 *   - imports      → other modules this app needs
 *
 * Subtask 4 adds LazarusConfigModule (validated .env).
 * Subtask 7 adds KafkaModule (producer connects to Kafka on boot).
 */
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
