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

export enum AnomalyType {
  CPU_SPIKE = 'cpu_spike',
  MEMORY_LEAK = 'memory_leak',
  PORT_COLLISION = 'port_collision',
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  CRITICAL = 'critical',
}

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

export class IngestAnomalyDto {
  @IsUUID('4')
  anomaly_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  source_id!: string;

  @IsEnum(AnomalyType)
  anomaly_type!: AnomalyType;

  @IsEnum(Severity)
  severity!: Severity;

  @IsISO8601({ strict: true })
  timestamp!: string;

  @IsObject()
  @Validate(IsRecordOfNumbersConstraint)
  metrics!: Record<string, number>;

  @IsOptional()
  @IsString()
  stack_trace?: string;

  @IsOptional()
  @IsObject()
  @Validate(IsRecordOfStringsConstraint)
  metadata?: Record<string, string>;
}
