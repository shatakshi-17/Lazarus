/**
 * Hardcoded demo anomaly for Subtask 8 one-shot Kafka produce (no HTTP API).
 *
 * Fixed UUID + source_id make Subtask 9 verification predictable — you can grep
 * for `pod-orchestrator-demo-01` or the anomaly_id in a Kafka consumer.
 */
import {
  AnomalyType,
  IngestAnomalyDto,
  Severity,
} from '../../common/dto/ingest-anomaly.dto';

/** Stable UUID v4 for demo messages — do not change without updating Subtask 9 checks. */
export const DEMO_ANOMALY_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

/** Kafka partition key for demo messages (Plan §5.2). */
export const DEMO_SOURCE_ID = 'pod-orchestrator-demo-01';

/**
 * Builds the canonical Subtask 8 test payload — valid per IngestAnomalyDto / §5.1.
 */
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
