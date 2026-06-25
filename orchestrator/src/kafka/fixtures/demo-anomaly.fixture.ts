// Stable fixture IDs — Subtask 9 consumer verification greps these constants.
import {
  AnomalyType,
  IngestAnomalyDto,
  Severity,
} from '../../common/dto/ingest-anomaly.dto';

export const DEMO_ANOMALY_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

export const DEMO_SOURCE_ID = 'pod-orchestrator-demo-01';

export function createDemoAnomalyDto(): IngestAnomalyDto {
  const dto = new IngestAnomalyDto();
  dto.anomaly_id = DEMO_ANOMALY_ID;
  dto.source_id = DEMO_SOURCE_ID;
  dto.anomaly_type = AnomalyType.CPU_SPIKE;
  dto.severity = Severity.MEDIUM;
  dto.timestamp = new Date().toISOString();
  dto.metrics = {
    cpu_percent: 97.5,
    load_avg_1m: 8.2,
  };
  dto.metadata = {
    trigger: 'subtask-8-demo',
    plane: 'orchestrator',
  };
  dto.stack_trace = 'Demo anomaly — Subtask 8 one-shot produce (not a real crash).';
  return dto;
}
