/**
 * Default HTTP controller — temporary placeholder from Nest CLI scaffold.
 *
 * Controllers map URLs to handler methods. This one exposes GET / so we can
 * sanity-check that the process is alive before real ingestion routes exist
 * (Plan Step 1.5: POST /api/v1/ingest/anomaly comes later).
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  /**
   * Nest injects AppService here automatically ("constructor injection").
   * We never call `new AppService()` ourselves — the framework manages lifetime.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * GET / — returns a plain text greeting.
   * Useful for quick curl/browser checks during local dev.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
