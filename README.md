# Lazarus

Self-healing infrastructure mesh for simulated AIOps — ingest anomalies, run an AI remediation pipeline, validate scripts, and execute fixes in an isolated sandbox with zero blast radius.

**Status:** Phase 1 — Docker Compose infrastructure (Kafka, Redis, Prometheus, Grafana). Application services (NestJS orchestrator, Python remediation-engine) are planned in later phases.

## Stack


| Layer          | Technology                    |
| -------------- | ----------------------------- |
| Control plane  | NestJS (planned)              |
| AI workers     | FastAPI + LangGraph (planned) |
| Event backbone | Apache Kafka 3.7 (KRaft)      |
| Reply bus      | Redis Streams                 |
| Observability  | Prometheus + Grafana          |
| Deployment     | Docker Compose on VPS         |


## Documentation

- **[Master Implementation Plan.md](Master%20Implementation%20Plan.md)** — architecture, phases, contracts
- **[docs/arch_01.md](docs/arch_01.md)** — step-by-step build log (KT / portfolio narrative)
Detailed setup, verification, and ops commands live in the implementation log and `Makefile` (VPS-oriented). This README will stay high-level; a fuller portfolio write-up can be added once the project is complete.
