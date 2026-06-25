/**
 * IngestAnomalyDto — the JSON contract for anomaly events (Master Plan §5.1).
 *
 * This file defines the *shape* of data that flows:
 *   HTTP ingest (Step 1.5, later) → Kafka topic `infrastructure-anomalies` → Python consumer
 *
 * Subtask 5 adds types + validation rules only — no HTTP controller yet.
 * Subtask 6 (KafkaProducerService) will JSON-serialize this class and use
 * `source_id` as the Kafka partition key; headers `anomaly_type`, `severity`, and
 * `trace_id` are set at produce time (trace_id is not a DTO field in §5.1).
 */
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Allowed anomaly categories — matches simulation presets in Step 1.5
 * (cpu-spike, memory-leak, port-collision endpoints).
 */
export enum AnomalyType {
  CPU_SPIKE = 'cpu_spike',
  MEMORY_LEAK = 'memory_leak',
  PORT_COLLISION = 'port_collision',
}

/**
 * How urgent the anomaly is — drives routing and dashboard coloring later.
 */
export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  CRITICAL = 'critical',
}

/**
 * Ensures `metrics` is a plain object like { cpu_percent: 98.2 } — every value a finite number.
 * class-validator's @IsNumber() works on single fields, not dynamic object keys.
 */
@ValidatorConstraint({ name: 'isRecordOfNumbers', async: false })
export class IsRecordOfNumbersConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    return Object.values(value as Record<string, unknown>).every(
      (entry) => typeof entry === 'number' && Number.isFinite(entry),
    );
  }

  defaultMessage(): string {
    return 'metrics must be an object whose values are finite numbers (e.g. { cpu_percent: 98.2 })';
  }
}

/**
 * Ensures optional `metadata` values are all strings (e.g. { region: "us-east" }).
 */
@ValidatorConstraint({ name: 'isRecordOfStrings', async: false })
export class IsRecordOfStringsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    return Object.values(value as Record<string, unknown>).every(
      (entry) => typeof entry === 'string',
    );
  }

  defaultMessage(): string {
    return 'metadata must be an object whose values are strings';
  }
}

/**
 * Canonical anomaly payload — shared by HTTP ingest, Kafka produce, and (later) Python Pydantic mirror.
 *
 * The `!` on required fields tells TypeScript "Nest/class-validator will assign these before use"
 * (strictPropertyInitialization — see Subtask 3 log in docs/arch_02.md).
 */
export class IngestAnomalyDto {
  /** Unique event id (UUID v4) — idempotency and tracing across services. */
  @IsUUID('4')
  anomaly_id!: string;

  /**
   * Logical source of the anomaly (pod, host, service name).
   * Kafka uses this as the partition *key* so all events from one source stay ordered (Plan §5.2).
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  source_id!: string;

  @IsEnum(AnomalyType)
  anomaly_type!: AnomalyType;

  @IsEnum(Severity)
  severity!: Severity;

  /** When the anomaly was observed — ISO-8601 string (e.g. 2026-06-25T12:00:00.000Z). */
  @IsISO8601({ strict: true })
  timestamp!: string;

  /** Numeric signals that describe the anomaly (CPU %, memory MB, etc.). */
  @IsObject()
  @Validate(IsRecordOfNumbersConstraint)
  metrics!: Record<string, number>;

  /** Optional stack trace or log excerpt for diagnosis agents (Phase 2). */
  @IsOptional()
  @IsString()
  stack_trace?: string;

  /** Optional string tags (environment, team, run id) — not used as Kafka headers in §5.2. */
  @IsOptional()
  @IsObject()
  @Validate(IsRecordOfStringsConstraint)
  metadata?: Record<string, string>;
}
