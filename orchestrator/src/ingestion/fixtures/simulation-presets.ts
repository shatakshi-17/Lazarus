import { v4 as uuidv4 } from 'uuid';
import {
  AnomalyType,
  IngestAnomalyDto,
  Severity,
} from '../../common/dto/ingest-anomaly.dto';

export const PRESET_SOURCE_CPU_SPIKE = 'pod-sim-cpu-7f3a';
export const PRESET_SOURCE_MEMORY_LEAK = 'pod-sim-mem-8b4c';
export const PRESET_SOURCE_PORT_COLLISION = 'pod-sim-port-9d5e';

function baseDto(
  sourceId: string,
  anomalyType: AnomalyType,
  severity: Severity,
  metrics: Record<string, number>,
  metadata: Record<string, string>,
  stackTrace: string,
): IngestAnomalyDto {
  const dto = new IngestAnomalyDto();
  dto.anomaly_id = uuidv4();
  dto.source_id = sourceId;
  dto.anomaly_type = anomalyType;
  dto.severity = severity;
  dto.timestamp = new Date().toISOString();
  dto.metrics = metrics;
  dto.metadata = metadata;
  dto.stack_trace = stackTrace;
  return dto;
}

export function buildCpuSpikePreset(sourceId?: string): IngestAnomalyDto {
  return baseDto(
    sourceId ?? PRESET_SOURCE_CPU_SPIKE,
    AnomalyType.CPU_SPIKE,
    Severity.CRITICAL,
    {
      cpu_percent: 98.2,
      load_avg_1m: 12.4,
      load_avg_5m: 8.1,
      runnable_threads: 64,
    },
    {
      preset: 'cpu-spike',
      simulated_path: '/simulated/proc/loadavg',
      trigger: 'simulate-endpoint',
    },
    'Simulated CPU spike: sustained run queue depth exceeded threshold on worker node.',
  );
}

export function buildMemoryLeakPreset(sourceId?: string): IngestAnomalyDto {
  return baseDto(
    sourceId ?? PRESET_SOURCE_MEMORY_LEAK,
    AnomalyType.MEMORY_LEAK,
    Severity.CRITICAL,
    {
      memory_mb: 7680,
      memory_growth_mb_per_min: 512,
      heap_used_percent: 94.5,
      gc_pause_ms: 420,
    },
    {
      preset: 'memory-leak',
      simulated_path: '/simulated/var/log/leak.pid',
      trigger: 'simulate-endpoint',
    },
    'Simulated memory leak: heap growth 512 MB/min without corresponding release.',
  );
}

export function buildPortCollisionPreset(sourceId?: string): IngestAnomalyDto {
  return baseDto(
    sourceId ?? PRESET_SOURCE_PORT_COLLISION,
    AnomalyType.PORT_COLLISION,
    Severity.MEDIUM,
    {
      conflicting_port: 8080,
      bind_attempts: 12,
      listeners_on_port: 2,
    },
    {
      preset: 'port-collision',
      simulated_path: '/simulated/etc/ports.d/8080.conf',
      trigger: 'simulate-endpoint',
    },
    'Simulated port collision: second process failed to bind 8080 — address already in use.',
  );
}
