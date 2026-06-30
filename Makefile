ifeq ($(OS),Windows_NT)
  SHELL := "C:/Program Files/Git/usr/bin/bash.exe"
  .SHELLFLAGS := -lc
endif

.DEFAULT_GOAL := help

COMPOSE ?= docker compose
INFRA_SERVICES := kafka redis prometheus grafana

.PHONY: help
help: ## Show this help (default target)
	@echo "Lazarus infra shortcuts — Phase 1 backbone services only"
	@echo
	@echo "Targets:"
	@grep -E '^[a-zA-Z0-9_.-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "Infra services: $(INFRA_SERVICES)"

.PHONY: env-check
env-check: ## Fail fast if .env is missing (copy from .env.example first)
	@test -f .env || (echo "ERROR: .env not found. Run: cp .env.example .env" && exit 1)
	@echo .env OK

.PHONY: compose-config
compose-config: env-check ## Validate docker-compose.yml (no containers started)
	$(COMPOSE) config --quiet
	@echo compose config OK

.PHONY: infra-up
infra-up: env-check ## Start kafka, redis, prometheus, grafana (detached)
	$(COMPOSE) up -d $(INFRA_SERVICES)

.PHONY: infra-down
infra-down: ## Stop infra containers (keeps named volumes)
	$(COMPOSE) stop $(INFRA_SERVICES)

.PHONY: infra-down-v
infra-down-v: ## Stop infra and remove containers (keeps volumes unless down -v)
	$(COMPOSE) down

.PHONY: infra-down-clean
infra-down-clean: ## Stop infra AND delete named volumes (destructive — fresh TSDB/Kafka data)
	$(COMPOSE) down -v

.PHONY: infra-ps
infra-ps: ## Show status + health of infra containers
	$(COMPOSE) ps $(INFRA_SERVICES)

.PHONY: infra-restart
infra-restart: ## Restart all infra services
	$(COMPOSE) restart $(INFRA_SERVICES)

.PHONY: infra-pull
infra-pull: ## Pull latest images for infra services
	$(COMPOSE) pull $(INFRA_SERVICES)

.PHONY: infra-logs
infra-logs: ## Tail logs for all infra services (Ctrl+C to exit)
	$(COMPOSE) logs -f $(INFRA_SERVICES)

.PHONY: infra-logs-%
infra-logs-%: ## Tail logs for one service (e.g. make infra-logs-kafka)
	$(COMPOSE) logs -f $*
