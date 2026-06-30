import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { IngestAnomalyDto } from '../../common/dto/ingest-anomaly.dto';

export class IngestBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngestAnomalyDto)
  anomalies!: IngestAnomalyDto[];
}
