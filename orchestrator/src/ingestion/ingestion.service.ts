import { Injectable } from '@nestjs/common';
import { IngestAnomalyDto } from '../common/dto/ingest-anomaly.dto';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { IngestAcceptedDto } from './dto/ingest-accepted.dto';
import { SimulateOptionsDto } from './dto/simulate-options.dto';
import {
  buildCpuSpikePreset,
  buildMemoryLeakPreset,
  buildPortCollisionPreset,
} from './fixtures/simulation-presets';

@Injectable()
export class IngestionService {
  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  async ingestAnomaly(dto: IngestAnomalyDto): Promise<IngestAcceptedDto> {
    const metadata = await this.kafkaProducerService.produceAnomaly(dto);
    return this.toAcceptedResponse(dto.anomaly_id, metadata);
  }

  async simulateCpuSpike(options?: SimulateOptionsDto): Promise<IngestAcceptedDto> {
    return this.ingestAnomaly(buildCpuSpikePreset(options?.source_id));
  }

  async simulateMemoryLeak(options?: SimulateOptionsDto): Promise<IngestAcceptedDto> {
    return this.ingestAnomaly(buildMemoryLeakPreset(options?.source_id));
  }

  async simulatePortCollision(
    options?: SimulateOptionsDto,
  ): Promise<IngestAcceptedDto> {
    return this.ingestAnomaly(buildPortCollisionPreset(options?.source_id));
  }

  async ingestBatch(anomalies: IngestAnomalyDto[]): Promise<IngestAcceptedDto[]> {
    const metadataList =
      await this.kafkaProducerService.produceAnomalyBatch(anomalies);
    return metadataList.map((metadata, index) =>
      this.toAcceptedResponse(anomalies[index].anomaly_id, metadata),
    );
  }

  private toAcceptedResponse(
    anomalyId: string,
    metadata: { partition: number; offset?: string; baseOffset?: string },
  ): IngestAcceptedDto {
    const response = new IngestAcceptedDto();
    response.anomaly_id = anomalyId;
    response.partition = metadata.partition;
    response.offset = metadata.offset ?? metadata.baseOffset ?? '0';
    return response;
  }
}
