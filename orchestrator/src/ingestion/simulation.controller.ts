import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IngestAcceptedDto } from './dto/ingest-accepted.dto';
import { SimulateOptionsDto } from './dto/simulate-options.dto';
import { IngestionService } from './ingestion.service';

@Controller('api/v1/simulate')
export class SimulationController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('cpu-spike')
  @HttpCode(202)
  async cpuSpike(
    @Body() options: SimulateOptionsDto = {},
  ): Promise<IngestAcceptedDto> {
    return this.ingestionService.simulateCpuSpike(options);
  }

  @Post('memory-leak')
  @HttpCode(202)
  async memoryLeak(
    @Body() options: SimulateOptionsDto = {},
  ): Promise<IngestAcceptedDto> {
    return this.ingestionService.simulateMemoryLeak(options);
  }

  @Post('port-collision')
  @HttpCode(202)
  async portCollision(
    @Body() options: SimulateOptionsDto = {},
  ): Promise<IngestAcceptedDto> {
    return this.ingestionService.simulatePortCollision(options);
  }
}
