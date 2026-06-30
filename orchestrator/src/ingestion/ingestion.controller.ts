import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IngestAnomalyDto } from '../common/dto/ingest-anomaly.dto';
import { IngestAcceptedDto } from './dto/ingest-accepted.dto';
import { IngestBatchDto } from './dto/ingest-batch.dto';
import { IngestionService } from './ingestion.service';

@Controller('api/v1/ingest')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('anomaly')
  @HttpCode(202)
  async ingestAnomaly(
    @Body() dto: IngestAnomalyDto,
  ): Promise<IngestAcceptedDto> {
    return this.ingestionService.ingestAnomaly(dto);
  }

  @Post('batch')
  @HttpCode(202)
  async ingestBatch(@Body() dto: IngestBatchDto): Promise<IngestAcceptedDto[]> {
    return this.ingestionService.ingestBatch(dto.anomalies);
  }
}
