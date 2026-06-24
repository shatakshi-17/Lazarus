# Lazarus — Master Implementation Plan

> **Project:** Lazarus — Self-Healing Distributed Infrastructure Mesh  
> **Author:** Principal Systems Architect (AI-assisted)  
> **Date:** 2026-06-23  
> **Status:** ✅ APPROVED — 2026-06-23 sign-off (Gemini, `/dashboard`, 100% OSS cost policy)  
> **Deployment Target:** Hostinger KVM2 VPS (4 vCPU / 8 GB) · `/dashboard` on Vercel hobby tier

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architectural Principles & Non-Negotiables](#2-architectural-principles--non-negotiables)
3. [Repository Layout](#3-repository-layout)
4. [Technology Stack & Version Pinning](#4-technology-stack--version-pinning)
5. [Cross-Cutting Contracts](#5-cross-cutting-contracts)
6. [Phase 1 — High-Performance Ingestion & Messaging](#6-phase-1--high-performance-ingestion--messaging)
7. [Phase 2 — Python LangGraph Orchestration & Verification Loop](#7-phase-2--python-langgraph-orchestration--verification-loop)
8. [Phase 3 — Isolated Sandboxed Execution Enclave](#8-phase-3--isolated-sandboxed-execution-enclave)
9. [Phase 4 — Simulation & Observability Layer](#9-phase-4--simulation--observability-layer)
10. [Phase 5 — Chaos Engineering & Load Testing](#10-phase-5--chaos-engineering--load-testing)
11. [Infrastructure & Docker Compose Topology](#11-infrastructure--docker-compose-topology)
12. [Security Model](#12-security-model)
13. [Observability & SLO Targets](#13-observability--slo-targets)
14. [Implementation Sequence & Milestones](#14-implementation-sequence--milestones)
15. [Risk Register & Mitigations](#15-risk-register--mitigations)
16. [Definition of Done (Per Phase)](#16-definition-of-done-per-phase)
17. [Open Questions for Stakeholder Review](#17-open-questions-for-stakeholder-review)

---

## 1. Executive Summary

Lazarus is a **demonstration-grade AIOps mesh** that ingests simulated infrastructure anomalies, routes them through a **multi-agent LangGraph remediation pipeline**, validates AI-generated Bash scripts via **Pydantic safety gates**, and executes approved scripts inside a **network-isolated, resource-capped Docker sandbox**. The blast radius of an LLM hallucination is intentionally zero.

This plan defines **five sequential phases** that build on each other. Each phase produces a testable vertical slice before the next begins. The NestJS `/orchestrator` is the **control plane**; the Python `/remediation-engine` is the **AI worker plane**; Kafka is the **durable event backbone**; Redis Streams is the **low-latency validated-payload bus** back to the orchestrator.

```
┌─────────────┐     HTTP/WS      ┌──────────────────┐     Kafka      ┌─────────────────────┐
│  Simulators │ ───────────────► │   /orchestrator  │ ─────────────► │ infrastructure-     │
│  (k6, curl) │                  │   (NestJS)       │                │ anomalies           │
└─────────────┘                  └────────┬─────────┘                └──────────┬──────────┘
                                          │ WebSocket                           │
                                          │ broadcast                           ▼
                                          ▼                          ┌─────────────────────┐
                                   ┌──────────────┐                  │ /remediation-engine │
                                   │   Frontend   │                  │ (FastAPI + LangGraph)│
                                   │   (Vercel)   │                  └──────────┬──────────┘
                                   └──────────────┘                             │
                                                                                 │ Redis Stream
                                                                                 │ validated-remediations
                                                                                 ▼
                                          ┌──────────────────◄─────────────────────┘
                                          │   Sandbox Worker (NestJS + dockerode)
                                          │   alpine · 50MB · 0.2 vCPU · no network
                                          └──────────────────┘
```

---

## 2. Architectural Principles & Non-Negotiables


| #   | Principle                    | Enforcement                                                                           |
| --- | ---------------------------- | ------------------------------------------------------------------------------------- |
| P1  | **Zero-trust AI execution**  | All LLM output passes regex blacklist + Pydantic schema before any Docker invocation  |
| P2  | **Deterministic ordering**   | Kafka partition key = `anomaly.source_id` (simulated host/pod ID)                     |
| P3  | **Blast-radius containment** | Sandbox: `NetworkMode: none`, 50 MB RAM, 0.2 vCPU, 3000 ms hard timeout               |
| P4  | **Strict typing end-to-end** | TypeScript strict mode in NestJS; Pydantic v2 models in Python                        |
| P5  | **Observable by default**    | Every state transition emits a WebSocket event + Prometheus counter/histogram         |
| P6  | **Simulation-first**         | No real production hosts; all telemetry is synthetic and mounted into sandbox volumes |
| P7  | **Documentation protocol**   | Every code change logged in `docs/architecture_evolution_*.md` per existing protocol  |


---

## 3. Repository Layout

```
Lazarus/
├── docker-compose.yml              # Kafka, Redis, Prometheus, Grafana, app services
├── .env.example                    # All secrets & tunables documented
├── Makefile                        # Common dev/ops shortcuts
├── docs/
│   ├── architecture_evolution_01.md
│   └── Master Implementation Plan.md   ← this file
├── orchestrator/                   # NestJS control plane
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── Dockerfile
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── config/                 # @nestjs/config + Joi validation
│       ├── ingestion/              # HTTP ingestion controller + DTOs
│       ├── kafka/                  # Custom Kafka transporter config
│       ├── sandbox/                # dockerode worker service
│       ├── events/                 # WebSocket gateway (Phase 4)
│       ├── metrics/                # Prometheus module (Phase 4)
│       └── common/                 # Shared types, interceptors, filters
├── remediation-engine/             # Python FastAPI + LangGraph workers
│   ├── pyproject.toml              # Poetry or uv-managed deps
│   ├── Dockerfile
│   └── src/
│       ├── main.py                 # FastAPI health + admin endpoints
│       ├── consumer.py             # Kafka consumer loop
│       ├── publisher.py            # Redis Streams publisher
│       ├── graph/
│       │   ├── state.py            # LangGraph TypedDict state
│       │   ├── nodes.py            # Diagnostic, Synthesis, Safety Auditor
│       │   └── workflow.py         # Compiled StateGraph
│       ├── agents/                 # LLM prompt templates & chains
│       ├── safety/
│       │   ├── schemas.py          # Pydantic remediation payload
│       │   └── blacklist.py        # Regex deny-list engine
│       └── models/                 # Shared anomaly DTOs (mirrors NestJS)
├── dashboard/                      # Next.js SPA — Vercel (portfolio + observability storyboard)
│   ├── package.json
│   └── src/
│       ├── app/                    # App Router pages
│       ├── components/
│       │   ├── ArchitectureMesh.tsx  # React Flow canvas (WebSocket-driven)
│       │   ├── SwaggerEmbed.tsx      # iframe → NestJS /api/docs on VPS
│       │   └── GrafanaMetrics.tsx    # iframe → Grafana on VPS
│       └── hooks/
│           └── useLazarusEvents.ts   # Socket.io client for live mesh animation
├── load-testing/
│   ├── chaos-test.js               # k6 script (Phase 5)
│   └── README.md
└── infra/
    ├── prometheus/
    │   └── prometheus.yml
    └── grafana/
        └── provisioning/           # Dashboards + datasources
```

---

## 4. Technology Stack & Version Pinning


| Layer               | Technology                             | Version                 | Rationale                                                          |
| ------------------- | -------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| Control Plane       | NestJS                                 | ^10.x                   | Mature microservices, WebSocket, Swagger, DI                       |
| AI Worker Plane     | FastAPI                                | ^0.111+                 | Async-native, Pydantic v2, high throughput                         |
| Orchestration Graph | LangGraph                              | ^0.2.x                  | Explicit state machine, inspectable nodes                          |
| LLM Provider        | **Google Gemini** (AI Studio free key) | `gemini-2.5-flash-lite` | 15 RPM / 250000 tokens/minute free tier; `LLM_MOCK=true` during k6 |
| Portfolio Frontend  | Next.js + React Flow                   | ^14.x                   | Vercel hobby tier; WebSocket-driven mesh canvas                    |
| Message Bus         | Apache Kafka                           | 3.7 (KRaft)             | Durable buffering, partition ordering                              |
| Coordination        | **Valkey 8** (Redis-compatible OSS)    | Streams                 | Low-latency reply path; no Redis Enterprise license                |
| Sandbox Runtime     | Docker Engine + dockerode              | ^4.x                    | Programmatic container lifecycle                                   |
| Metrics             | Prometheus + Grafana                   | OSS images              | Self-hosted on KVM2 — zero license cost                            |
| Load Test           | k6                                     | OSS (`grafana/k6`)      | Scriptable HTTP flood; throttler bypass via shared header          |


**Cost policy:** 100% OSS / free-tier. No paid API keys, no premium Docker images, no Redis Enterprise.

**KRaft vs Zookeeper decision:** Use **KRaft mode** (no Zookeeper) — fewer containers, simpler ops on a single KVM2 VPS, Kafka 3.7+ production-ready KRaft. JVM heap capped at 512 MB in Compose to stay within 8 GB VPS budget.

---

## 5. Cross-Cutting Contracts

### 5.1 Anomaly Ingestion Payload (HTTP → Kafka)

```typescript
// POST /api/v1/ingest/anomaly
interface IngestAnomalyDto {
  anomaly_id: string;          // UUID v4, client-supplied or server-generated
  source_id: string;           // Kafka partition key (e.g. "pod-frontend-7f3a")
  anomaly_type: 'cpu_spike' | 'memory_leak' | 'port_collision';
  severity: 'low' | 'medium' | 'critical';
  timestamp: string;           // ISO-8601
  metrics: Record<string, number>;  // e.g. { cpu_percent: 98.2, memory_mb: 4096 }
  stack_trace?: string;
  metadata?: Record<string, string>;
}
```

### 5.2 Kafka Topic Schema


| Topic                                  | Partitions | Replication         | Key          | Value                   |
| -------------------------------------- | ---------- | ------------------- | ------------ | ----------------------- |
| `infrastructure-anomalies`             | 6          | 1 (single-node VPS) | `source_id`  | JSON `IngestAnomalyDto` |
| `remediation-results` (optional audit) | 3          | 1                   | `anomaly_id` | JSON execution outcome  |


**Partitioning strategy:** `hash(source_id) % num_partitions` via Kafka producer `key` field. Guarantees ordered processing per simulated host/pod.

### 5.3 Validated Remediation Payload (Redis Stream → NestJS Sandbox Worker)

```python
class ValidatedRemediation(BaseModel):
    anomaly_id: str
    source_id: str
    diagnosis: str                    # Diagnostic Agent output
    remediation_script: str           # Bash, max 4 KB
    safety_audit_passed: bool         # Must be True
    safety_violations: list[str]      # Empty if passed
    graph_trace_id: str               # LangGraph run ID for observability
    created_at: datetime
```

**Redis Stream:** `validated-remediations` · Consumer Group: `sandbox-workers`

### 5.4 WebSocket Event Envelope

```typescript
interface WsEvent<T = unknown> {
  event: WsEventType;
  timestamp: string;
  trace_id: string;
  payload: T;
}

type WsEventType =
  | 'anomaly_detected'
  | 'diagnosis_complete'
  | 'script_synthesized'
  | 'safety_audit_passed'
  | 'safety_audit_failed'
  | 'sandbox_execution_started'
  | 'sandbox_execution_success'
  | 'sandbox_execution_failed'
  | 'sandbox_execution_timeout';
```

---

## 6. Phase 1 — High-Performance Ingestion & Messaging

### 6.1 Goal

Stand up the NestJS orchestrator, Python remediation-engine skeleton, and full Docker Compose infrastructure. Prove end-to-end: **HTTP ingest → Kafka produce → Python consume (log-only)**.

### 6.2 Step-by-Step Tasks

#### Step 1.1 — Monorepo Bootstrap

- [ ] Initialize git repo at `Lazarus/` root (if not already)
- [ ] Create `.gitignore`, `.env.example`, `Makefile`
- [ ] Add `README.md` with quick-start (dev only, not architecture doc)

#### Step 1.2 — Docker Compose Infrastructure

- [ ] Author `docker-compose.yml` with services:


| Service              | Image                        | Ports | Purpose           |
| -------------------- | ---------------------------- | ----- | ----------------- |
| `kafka`              | `bitnami/kafka:3.7` (KRaft)  | 9092  | Event backbone    |
| `redis`              | `redis:7-alpine`             | 6379  | Streams reply bus |
| `prometheus`         | `prom/prometheus`            | 9090  | Metrics scrape    |
| `grafana`            | `grafana/grafana`            | 3000  | Dashboards        |
| `orchestrator`       | build `./orchestrator`       | 3001  | NestJS API        |
| `remediation-engine` | build `./remediation-engine` | 8000  | FastAPI worker    |


- [ ] Configure Kafka KRaft single-node: `KAFKA_CFG_NODE_ID=1`, `KAFKA_CFG_PROCESS_ROLES=broker,controller`
- [ ] Auto-create topics on first produce: `infrastructure-anomalies` (6 partitions)
- [ ] Shared Docker network: `lazarus-mesh`
- [ ] Volume mounts for Prometheus config and Grafana provisioning

#### Step 1.3 — NestJS Orchestrator Scaffold

- [ ] `nest new orchestrator --strict --package-manager npm`
- [ ] Install deps:
  - `@nestjs/microservices`, `kafkajs`
  - `@nestjs/config`, `joi`
  - `class-validator`, `class-transformer`
  - `uuid`
- [ ] Configure `tsconfig.json`: `"strict": true`, `"noImplicitAny": true`
- [ ] Create `ConfigModule` with validated env schema:

```env
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=lazarus-orchestrator
KAFKA_ANOMALY_TOPIC=infrastructure-anomalies
REDIS_URL=redis://redis:6379
PORT=3001
DOCKER_HOST=unix:///var/run/docker.sock
```

#### Step 1.4 — Kafka Transporter Module

- [ ] Create `src/kafka/kafka.module.ts` exporting a `KafkaProducerService`
- [ ] Configure producer with:
  - `acks: 'all'` (or `'1'` on single-node — document tradeoff)
  - `compression: CompressionTypes.LZ4`
  - `retry: { retries: 5 }`
- [ ] Implement `produceAnomaly(dto: IngestAnomalyDto): Promise<RecordMetadata>`
  - Partition key = `dto.source_id`
  - Value = JSON-serialized DTO
  - Headers: `anomaly_type`, `severity`, `trace_id`

#### Step 1.5 — Ingestion Controller

- [ ] Create `POST /api/v1/ingest/anomaly` with:
  - `@Body()` validated via `class-validator` DTO
  - `@ApiTags('Ingestion')` (Swagger stub for Phase 4)
  - Returns `202 Accepted` with `{ anomaly_id, partition, offset }`
- [ ] Create `POST /api/v1/ingest/batch` for bulk simulation (used by k6)
- [ ] Implement three **simulation preset endpoints** (convenience wrappers):
  - `POST /api/v1/simulate/cpu-spike`
  - `POST /api/v1/simulate/memory-leak`
  - `POST /api/v1/simulate/port-collision`
  - Each generates realistic synthetic payloads (deterministic seeds optional)

#### Step 1.6 — Python Remediation Engine Scaffold

- [ ] Initialize `remediation-engine/` with `pyproject.toml` (Python ≥ 3.11)
- [ ] Core deps: `fastapi`, `uvicorn[standard]`, `aiokafka`, `redis`, `pydantic`, `pydantic-settings`
- [ ] Create `src/main.py` with `GET /health` and `GET /ready`
- [ ] Create `src/consumer.py`:
  - `AIOKafkaConsumer` subscribed to `infrastructure-anomalies`
  - Consumer group: `remediation-workers`
  - `enable_auto_commit: False` — manual commit after processing
  - Phase 1: log consumed messages; Phase 2: invoke LangGraph

#### Step 1.7 — Phase 1 Integration Test

- [ ] `docker compose up -d`
- [ ] `curl -X POST http://localhost:3001/api/v1/simulate/cpu-spike`
- [ ] Verify: Kafka topic receives message; Python worker logs consumption
- [ ] Document result in `architecture_evolution_01.md` Entry #2

### 6.3 Phase 1 Deliverables

- Running Docker Compose stack on KVM2
- NestJS ingestion API producing to Kafka with partition keys
- Python consumer reading from Kafka (log-only)
- Health endpoints on both services

---

## 7. Phase 2 — Python LangGraph Orchestration & Verification Loop

### 7.1 Goal

Transform raw anomalies into **validated, safety-audited Bash remediation scripts** via a three-node LangGraph state machine, then publish approved payloads to Redis Streams.

### 7.2 LangGraph State Machine Design

```
                    ┌─────────────────┐
                    │   START         │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  diagnostic     │  Node 1: Root-cause analysis
                    │  _agent           │  Input: anomaly payload + stack trace
                    └────────┬────────┘  Output: state.diagnosis (string)
                             │
                             ▼
                    ┌─────────────────┐
                    │  synthesis      │  Node 2: Bash script generation
                    │  _agent           │  Input: state.diagnosis
                    └────────┬────────┘  Output: state.remediation_script
                             │
                             ▼
                    ┌─────────────────┐
                    │  safety         │  Node 3: Regex + Pydantic gate
                    │  _auditor         │  Output: state.safety_audit_passed
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              passed│                 │failed
                    ▼                 ▼
            ┌──────────────┐   ┌──────────────┐
            │ publish_to   │   │ emit_failure │
            │ redis        │   │ (log + metric)│
            └──────┬───────┘   └──────────────┘
                   │
                   ▼
                  END
```

#### State Schema (`graph/state.py`)

```python
class RemediationState(TypedDict):
    anomaly: AnomalyPayload
    diagnosis: str | None
    remediation_script: str | None
    safety_audit_passed: bool
    safety_violations: list[str]
    graph_trace_id: str
    error: str | None
```

### 7.3 Step-by-Step Tasks

#### Step 2.1 — LLM Integration Layer

- [ ] Install: `langgraph`, `langchain-openai` (or `langchain-anthropic`)
- [ ] Create `agents/prompts.py` with system prompts for each node:
  - **Diagnostic Agent:** "You are an SRE. Given telemetry and stack trace, output a single-paragraph root cause. No remediation advice."
  - **Synthesis Agent:** "Given a diagnosis, write a minimal Bash script (≤30 lines) that fixes the issue in a simulated environment. Output ONLY the script, no markdown fences."
  - **Safety Auditor:** Deterministic — no LLM call; pure Python regex + Pydantic
- [ ] Configure `OPENAI_API_KEY`, `LLM_MODEL=gpt-4o-mini` (cost-effective for demo)
- [ ] Implement retry with exponential backoff (max 3 attempts) on LLM timeouts

#### Step 2.2 — Node Implementations (`graph/nodes.py`)

**Node 1 — Diagnostic Agent**

- [ ] Input: `state.anomaly` (metrics, stack_trace, anomaly_type)
- [ ] Call LLM with structured output parser
- [ ] Output: `state.diagnosis`

**Node 2 — Synthesis Agent**

- [ ] Input: `state.diagnosis`, `state.anomaly.anomaly_type`
- [ ] Include few-shot examples per anomaly type (in-context, not RAG)
- [ ] Strip markdown code fences from LLM output
- [ ] Enforce max script length: 4096 bytes

**Node 3 — Safety Auditor**

- [ ] Run `safety/blacklist.py` regex engine against script
- [ ] Blocklist patterns (minimum set):

```python
BLOCKLIST_PATTERNS = [
    r'rm\s+-rf',           # destructive deletion
    r'>\s*/dev/sd',        # raw disk writes
    r'wget|curl',          # network egress
    r'nc\s|netcat',        # reverse shells
    r'chown|chmod\s+777',  # permission escalation
    r'mkfs|dd\s+if=',      # disk formatting
    r';\s*sudo',           # privilege escalation
    r'\|\s*bash',          # piped execution
    r'>\s*/etc/',          # system file overwrite
    r'eval\s*\(',          # dynamic eval
]
```

- [ ] Validate via `ValidatedRemediation` Pydantic model
- [ ] Set `safety_audit_passed = len(violations) == 0`

#### Step 2.3 — Conditional Edge Routing

- [ ] `workflow.add_conditional_edges("safety_auditor", route_after_audit, { "publish": "publish_to_redis", "fail": "emit_failure" })`
- [ ] Failed audits: log violations, increment `ai_safety_rejections_total` metric, do NOT publish

#### Step 2.4 — Redis Streams Publisher

- [ ] Create `publisher.py`:
  - `XADD validated-remediations * field value ...`
  - Include `graph_trace_id` for end-to-end tracing
- [ ] Stream maxlen ~10000 (approximate trimming) to prevent unbounded growth

#### Step 2.5 — NestJS Redis Stream Consumer (Stub)

- [ ] Create `src/sandbox/remediation-listener.service.ts`
- [ ] Use `ioredis` with `XREADGROUP` on `validated-remediations`
- [ ] Phase 2: log received payloads; Phase 3: invoke sandbox

#### Step 2.6 — Phase 2 Integration Test

- [ ] Ingest a `memory_leak` anomaly with a realistic stack trace
- [ ] Verify LangGraph completes all 3 nodes
- [ ] Verify Redis Stream receives validated payload
- [ ] Ingest anomaly designed to trigger safety failure (prompt injection in stack_trace) — verify rejection
- [ ] Log entry in architecture evolution doc

### 7.3 Phase 2 Deliverables

- Working 3-node LangGraph pipeline
- Pydantic + regex safety gate with test cases
- Redis Streams publish/consume loop
- Unit tests for blacklist engine (`pytest`)

---

## 8. Phase 3 — Isolated Sandboxed Execution Enclave

### 8.1 Goal

Execute validated Bash scripts inside a **disposable Alpine container** with extreme resource constraints and zero network access. Determine remediation success from stdout/stderr against simulation-specific success criteria.

### 8.2 Sandbox Architecture

```
RemediationListenerService
        │
        ▼
SandboxExecutionService
        │
        ├── 1. Prepare simulated volume (tmpfs/bind mount)
        ├── 2. dockerode.createContainer()
        │       Image: alpine:3.19
        │       Cmd: ['/bin/sh', '-c', script]
        │       HostConfig:
        │         Memory: 50 * 1024 * 1024        (50 MB)
        │         NanoCPUs: 200_000_000           (0.2 vCPU)
        │         NetworkMode: 'none'
        │         AutoRemove: true
        │         Binds: ['sandbox-{id}:/simulated:ro']
        ├── 3. Promise.race([container.wait(), timeout(3000ms)])
        ├── 4. Capture stdout/stderr via attach logs
        ├── 5. Evaluate success heuristics
        └── 6. Emit WebSocket event + Prometheus metrics
```

### 8.3 Step-by-Step Tasks

#### Step 3.1 — Dockerode Integration

- [ ] Install `dockerode`, `@types/dockerode`
- [ ] Mount Docker socket in orchestrator container: `/var/run/docker.sock`
- [ ] Create `SandboxExecutionService` with injected `ConfigService`

#### Step 3.2 — Simulated Virtual Volume

- [ ] Create `src/sandbox/simulation-volumes/` with fixture files per anomaly type:


| Anomaly Type     | Simulated Files                                | Expected Script Behavior                      |
| ---------------- | ---------------------------------------------- | --------------------------------------------- |
| `cpu_spike`      | `/simulated/proc/loadavg` (high values)        | Script "throttles" by writing normalized load |
| `memory_leak`    | `/simulated/var/log/leak.pid` + marker file    | Script removes pid file / clears cache marker |
| `port_collision` | `/simulated/etc/ports.d/8080.conf` (duplicate) | Script renames/conflicts resolved marker      |


- [ ] Volume created per execution: `tmpfs` or temp bind mount, destroyed after run

#### Step 3.3 — Container Lifecycle with Hard Timeout

```typescript
async executeScript(script: string, anomalyType: string): Promise<SandboxResult> {
  const TIMEOUT_MS = 3000;
  const container = await this.docker.createContainer({ /* constraints */ });
  await container.start();

  const result = await Promise.race([
    this.collectOutput(container),
    this.rejectAfter(TIMEOUT_MS, container),
  ]);

  return this.evaluateResult(result, anomalyType);
}
```

- [ ] On timeout: `container.kill()`, emit `sandbox_execution_timeout`
- [ ] Always attempt cleanup in `finally` block

#### Step 3.4 — Success Evaluation Heuristics

- [ ] Parse exit code (0 = success candidate)
- [ ] Check for success marker strings in stdout (per anomaly type)
- [ ] Verify simulated filesystem state changed as expected
- [ ] Return `SandboxResult { success, exitCode, stdout, stderr, durationMs, timedOut }`

#### Step 3.5 — Result Publishing

- [ ] XACK Redis Stream message on completion
- [ ] Optionally publish to Kafka `remediation-results` for audit trail
- [ ] Emit WebSocket events (Phase 4 wiring)

#### Step 3.6 — Phase 3 Integration Test

- [ ] End-to-end: ingest → LangGraph → Redis → sandbox → success
- [ ] Test timeout: inject `sleep 10` script via safety bypass test fixture — verify 3s kill
- [ ] Test network isolation: script with `wget` blocked at safety gate AND at network level
- [ ] Test OOM: script allocating >50MB — verify container killed by Docker cgroup

### 8.3 Phase 3 Deliverables

- `SandboxExecutionService` with dockerode
- Simulated volume fixtures for all 3 anomaly types
- Hard 3000ms timeout via `Promise.race()`
- Integration tests for success, timeout, and OOM paths

---

## 9. Phase 4 — Simulation & Observability Layer

### 9.1 Goal

Expose real-time state machine events to a future Vercel frontend, auto-generate API docs, and instrument the full pipeline with Prometheus metrics.

### 9.2 Step-by-Step Tasks

#### Step 4.1 — WebSocket Gateway

- [ ] Install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
- [ ] Create `EventsGateway` at namespace `/events`
- [ ] CORS: allow Vercel preview/production origins via env `FRONTEND_ORIGINS`
- [ ] Implement `EventsBroadcastService` injected into:
  - Ingestion controller → `anomaly_detected`
  - Remediation listener → forward diagnosis/script events (via Redis pub/sub bridge OR direct HTTP callback from Python)
  - Sandbox service → `sandbox_execution_*` events
- [ ] Room-based subscriptions: clients can `join` by `source_id` to filter events

**Python → NestJS event bridge:** Python publishes to Redis Pub/Sub channel `lazarus:events` with same `WsEvent` envelope; NestJS subscribes and re-broadcasts via Socket.io.

#### Step 4.2 — Swagger / OpenAPI

- [ ] Install `@nestjs/swagger`
- [ ] Configure in `main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('Lazarus Orchestrator API')
  .setDescription('Self-Healing Infrastructure Mesh — Control Plane')
  .setVersion('1.0')
  .addTag('Ingestion')
  .addTag('Simulation')
  .addTag('Health')
  .build();
SwaggerModule.setup('api/docs', app, document);
```

- [ ] Decorate all DTOs with `@ApiProperty()`
- [ ] Export OpenAPI JSON at `/api/docs-json` for frontend codegen

#### Step 4.3 — Prometheus Metrics

- [ ] Install `@willsoto/nestjs-prometheus`, `prom-client`
- [ ] Expose `GET /metrics` (standard Prometheus scrape path)
- [ ] Custom metrics:


| Metric Name                                  | Type      | Labels                        | Source                                  |
| -------------------------------------------- | --------- | ----------------------------- | --------------------------------------- |
| `lazarus_anomalies_ingested_total`           | Counter   | `anomaly_type`, `severity`    | Ingestion controller                    |
| `lazarus_kafka_produce_duration_seconds`     | Histogram | `topic`                       | Kafka producer                          |
| `lazarus_kafka_consumer_lag`                 | Gauge     | `topic`, `partition`, `group` | Admin API poll                          |
| `lazarus_ai_pipeline_duration_seconds`       | Histogram | `node`, `anomaly_type`        | Python (via Pushgateway or HTTP expose) |
| `lazarus_ai_safety_rejections_total`         | Counter   | `violation_type`              | Safety auditor                          |
| `lazarus_sandbox_execution_duration_seconds` | Histogram | `anomaly_type`, `result`      | Sandbox service                         |
| `lazarus_sandbox_executions_total`           | Counter   | `result`                      | Sandbox service                         |
| `lazarus_websocket_clients_connected`        | Gauge     | —                             | Events gateway                          |


- [ ] Configure Prometheus scrape targets in `infra/prometheus/prometheus.yml`
- [ ] Provision Grafana dashboard JSON with panels for each metric

#### Step 4.4 — Grafana Dashboards

- [ ] Dashboard: "Lazarus Pipeline Overview"
  - Ingestion rate (req/s)
  - Kafka consumer lag by partition
  - AI pipeline latency (p50, p95, p99)
  - Sandbox execution latency + success rate
  - Safety rejection rate
- [ ] Dashboard: "Chaos Test Results" (Phase 5 data)

#### Step 4.5 — Phase 4 Integration Test

- [ ] Connect Socket.io client (wscat or test script), verify event sequence for full pipeline
- [ ] Verify `/api/docs` renders all endpoints
- [ ] Verify `/metrics` returns Prometheus format; Grafana panels populate

### 9.4 Phase 4 Deliverables

- Socket.io gateway with full event catalog
- Swagger UI at `/api/docs`
- Prometheus metrics + Grafana dashboards
- Redis Pub/Sub bridge for Python → WebSocket events

---

## 10. Phase 5 — Chaos Engineering & Load Testing

### 10.1 Goal

Prove the mesh survives a **5,000 req/s cascading failure simulation** without OOM crashes, with Kafka buffering the burst and workers processing deterministically.

### 10.2 k6 Script Design (`load-testing/chaos-test.js`)

```javascript
// Stages:
// 1. Ramp: 0 → 5000 VUs over 30s
// 2. Sustain: 5000 VUs for 60s
// 3. Ramp down: 5000 → 0 over 15s

// Thresholds:
// - http_req_failed: rate < 0.01 (99% success at ingestion)
// - http_req_duration: p(95) < 500ms (NestJS ingestion)
// - custom: kafka_lag_max < 10000 ( polled separately )
```

#### Payload Strategy

- [ ] 40% `cpu_spike`, 35% `memory_leak`, 25% `port_collision`
- [ ] Randomize `source_id` across 100 simulated pods (exercises all 6 Kafka partitions)
- [ ] Include `anomaly_id` UUID per request for traceability

#### Step 5.1 — Load Test Tasks

- [ ] Create `load-testing/chaos-test.js` with k6 HTTP module
- [ ] Target: `POST /api/v1/ingest/batch` (batch size 10) to reduce HTTP overhead while hitting 5K anomalies/s
- [ ] Create `load-testing/monitor.sh` — polls Kafka lag + Redis stream length during test
- [ ] Create `load-testing/README.md` with run instructions:

```bash
k6 run --env BASE_URL=http://localhost:3001 load-testing/chaos-test.js
```

#### Step 5.2 — Pre-Flight Capacity Tuning (KVM2 VPS)

- [ ] Document minimum VPS specs: 4 vCPU, 8 GB RAM
- [ ] Kafka: `KAFKA_HEAP_OPTS="-Xmx1G -Xms1G"`
- [ ] NestJS: `UV_THREADPOOL_SIZE=16`
- [ ] Python workers: scale via `docker compose --scale remediation-engine=3`
- [ ] Set Kafka consumer `max.poll.records=10` to prevent worker OOM

#### Step 5.3 — Success Criteria


| Metric                            | Target                | Measurement                           |
| --------------------------------- | --------------------- | ------------------------------------- |
| Ingestion HTTP 5xx rate           | < 1%                  | k6 thresholds                         |
| NestJS process RSS                | < 512 MB during test  | `docker stats`                        |
| Kafka max consumer lag            | < 10,000 messages     | Prometheus gauge                      |
| Python worker OOM kills           | 0                     | `dmesg` / container restart count     |
| Sandbox executions                | Process without crash | Prometheus counter monotonic increase |
| End-to-end p99 (ingest → sandbox) | < 30s under load      | Grafana                               |


#### Step 5.4 — Post-Chaos Report

- [ ] Capture Grafana screenshots / export dashboard JSON
- [ ] Document results in `architecture_evolution_01.md`
- [ ] If targets missed: document tuning changes applied

### 10.3 Phase 5 Deliverables

- `chaos-test.js` with 5K req/s profile
- Monitoring script for live lag observation
- Post-chaos engineering report in architecture evolution log

---

## 11. Infrastructure & Docker Compose Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                     KVM2 VPS (Docker Host)                       │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────┐ │
│  │  Kafka   │  │  Redis   │  │ Prometheus │  │   Grafana    │ │
│  │  :9092   │  │  :6379   │  │   :9090    │  │    :3000     │ │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘  └──────┬───────┘ │
│       │             │              │                 │          │
│  ┌────┴─────────────┴──────────────┴─────────────────┴───────┐  │
│  │                    lazarus-mesh network                    │  │
│  │  ┌─────────────────┐       ┌──────────────────────────┐  │  │
│  │  │  orchestrator   │       │  remediation-engine (xN) │  │  │
│  │  │  :3001          │       │  :8000                    │  │  │
│  │  │  + docker.sock  │       │                          │  │  │
│  │  └─────────────────┘       └──────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                    /var/run/docker.sock                          │
│                              │                                   │
│                    ┌─────────▼─────────┐                         │
│                    │ Sandbox Containers │  (ephemeral, isolated) │
│                    │ alpine:3.19        │                         │
│                    └───────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │ HTTPS/WSS                          │ HTTPS (future)
         │                                    │
    ┌────┴─────┐                         ┌────┴─────┐
    │ k6 load  │                         │  Vercel  │
    │ tester   │                         │ Frontend │
    └──────────┘                         └──────────┘
```

---

## 12. Security Model


| Threat                                 | Mitigation                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| LLM generates `rm -rf /`               | Regex blacklist in Safety Auditor (Node 3)                                     |
| Script bypasses blacklist via encoding | Normalize script (decode base64, expand vars) before audit                     |
| Sandbox escapes to host                | Non-privileged container, no `--privileged`, read-only root where possible     |
| Network exfiltration from sandbox      | `NetworkMode: 'none'`                                                          |
| Resource exhaustion                    | 50 MB RAM + 0.2 vCPU + 3s timeout + AutoRemove                                 |
| Prompt injection via stack_trace       | Safety auditor is deterministic; LLM output never executed without audit       |
| Docker socket abuse                    | Orchestrator is the ONLY service with socket mount; scripts never touch socket |
| API abuse / DDoS                       | Rate limiting middleware (`@nestjs/throttler`) — 100 req/s per IP default      |
| Secret leakage                         | All secrets via `.env`; `.env` in `.gitignore`; example file only              |


---

## 13. Observability & SLO Targets


| SLO                                    | Target                     | Window         |
| -------------------------------------- | -------------------------- | -------------- |
| Ingestion availability                 | 99.9%                      | 30 days        |
| AI pipeline success rate (post-safety) | ≥ 85% of anomalies         | per chaos test |
| Sandbox execution success rate         | ≥ 80% of validated scripts | per chaos test |
| Mean time from ingest to sandbox start | < 5s (no load)             | steady state   |
| WebSocket event delivery latency       | < 100ms                    | steady state   |


---

## 14. Implementation Sequence & Milestones

```
Week 1 ─── Phase 1 ─── Infrastructure + Ingestion + Kafka
                │
                ▼
Week 2 ─── Phase 2 ─── LangGraph + Safety Gate + Redis Streams
                │
                ▼
Week 3 ─── Phase 3 ─── Docker Sandbox + Simulation Volumes
                │
                ▼
Week 4 ─── Phase 4 ─── WebSocket + Swagger + Prometheus/Grafana
                │
                ▼
Week 5 ─── Phase 5 ─── k6 Chaos Test + Tuning + Report
```

**Milestone gates:** Each phase must pass its Integration Test (Section 6.7, 7.6, 8.6, 9.5, 10.3) before the next phase begins.

---

## 15. Risk Register & Mitigations


| #   | Risk                                   | Likelihood | Impact   | Mitigation                                                      |
| --- | -------------------------------------- | ---------- | -------- | --------------------------------------------------------------- |
| R1  | LLM API rate limits under chaos test   | High       | Medium   | Mock LLM mode for load test; real LLM for functional tests      |
| R2  | Kafka single-node failure              | Medium     | High     | Accept for demo; document multi-broker prod path                |
| R3  | Docker socket security on VPS          | Medium     | Critical | Socket mount read-only; orchestrator runs as non-root user      |
| R4  | 5K req/s exceeds single VPS capacity   | Medium     | Medium   | Batch endpoint; horizontal Python workers; tune Kafka buffers   |
| R5  | LangGraph latency under load           | High       | Medium   | Worker pool scaling; async Kafka consumer; backpressure metrics |
| R6  | OneDrive sync conflicts on Windows dev | Low        | Low      | Develop on VPS or WSL2; `.gitignore` node_modules               |


---

## 16. Definition of Done (Per Phase)

### Phase 1 ✓

- [ ] `docker compose up` starts all infra services healthy
- [ ] Ingestion endpoint returns 202 with Kafka offset
- [ ] Python consumer logs messages from all 3 simulation endpoints
- [ ] Architecture evolution Entry written

### Phase 2 ✓

- [ ] LangGraph 3-node pipeline produces diagnosis + script
- [ ] Safety auditor rejects all blocklist patterns (pytest ≥ 20 cases)
- [ ] Validated payloads appear in Redis Stream
- [ ] NestJS listener logs received payloads

### Phase 3 ✓

- [ ] Sandbox executes approved script in isolated Alpine container
- [ ] 3000ms timeout kills runaway scripts
- [ ] Network isolation verified (wget fails at container level)
- [ ] All 3 anomaly types have passing end-to-end success paths

### Phase 4 ✓

- [ ] WebSocket client receives full event sequence
- [ ] Swagger UI accessible at `/api/docs`
- [ ] `/metrics` scraped by Prometheus; Grafana dashboards render
- [ ] CORS configured for Vercel origin placeholder

### Phase 5 ✓

- [ ] k6 chaos test completes without NestJS/Python OOM
- [ ] Kafka consumer lag returns to < 100 within 5 min post-test
- [ ] Post-chaos report documented with metrics screenshots

---

## 17. Sign-Off Ledger (Final — 2026-06-23)


| #   | Question                    | **Signed-Off Decision**                                                                  | Rationale                                                                      |
| --- | --------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Q1  | LLM provider?               | **Google Gemini** via Google AI Studio free key (`GOOGLE_API_KEY`, `gemini-2.0-flash`)   | Generous free tier; `langchain-google-genai` in Phase 2                        |
| Q2  | Mock LLM for chaos test?    | **Yes (`LLM_MOCK=true`)**                                                                | Mandatory during k6 flood to avoid Gemini rate limits                          |
| Q3  | Kafka reply path?           | **Valkey Streams + Kafka audit**                                                         | Valkey Streams → sandbox worker; Kafka `remediation-results` → immutable audit |
| Q4  | Python dependency manager?  | `**uv` + `pyproject.toml`**                                                              | Fast, modern Python tooling                                                    |
| Q5  | NestJS package manager?     | `**npm**`                                                                                | Default, predictable                                                           |
| Q6  | Minimum VPS spec?           | **4 vCPU / 8 GB RAM** (Hostinger KVM2)                                                   | JVM/process memory flags must not exceed this budget                           |
| Q7  | Rate limiting?              | **100 req/s per IP** via `@nestjs/throttler`; k6 bypass via `x-lazarus-k6-bypass` header | Protects API; chaos test exempted programmatically                             |
| Q8  | Architecture evolution log? | **YES — strictly required**                                                              | Every step logged in `docs/architecture_evolution_01.md`                       |


**Structural addition (sign-off):** `/dashboard` Next.js SPA on Vercel — React Flow mesh, Grafana iframe, Swagger iframe.

---



