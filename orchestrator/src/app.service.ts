/**
 * Default injectable service — placeholder business logic from Nest CLI.
 *
 * Services hold reusable logic. Controllers stay thin and delegate here.
 * Real orchestrator logic (Kafka produce, sandbox, WebSocket) will live in
 * dedicated services under src/kafka/, src/ingestion/, etc.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * Returns a fixed greeting string.
   * Replace or remove once ingestion and health modules are in place.
   */
  getHello(): string {
    return 'Hello World!';
  }
}
