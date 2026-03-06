# FinanceOS Architecture

## 1) System overview

FinanceOS is a modular, self-hosted web application built with:

- **Backend**: Node.js + Express REST APIs
- **Frontend**: React SPA
- **Database**: MongoDB

The runtime model is intentionally single-user and privacy-first. The frontend calls backend REST endpoints, and backend services orchestrate persistence, intelligence calculations, backup, and broker ingestion.

## 2) Backend module architecture

Backend code is organized by domain modules and shared services.

### Core domains
- Authentication and recovery
- Dashboard intelligence
- Portfolio and holdings
- Goals and goal intelligence
- Fixed deposits / EPF / NPS / PPF
- Physical commodities
- Cash accounts, assets, liabilities
- Settings, audit logs, backup/restore
- Broker integrations and broker file imports

### Layering pattern
Typical module layering follows:

1. **Routes**: endpoint definitions and middleware binding.
2. **Controllers**: request validation and orchestration.
3. **Services**: business logic and cross-module computations.
4. **Models**: MongoDB schemas and persistence concerns.

### Cross-cutting backend concerns
- Session/auth middleware
- Error middleware
- Audit trail logging
- Backup jobs and restore services
- Configuration-driven strategy modules (allocation targets, opportunity strategy)

## 3) Frontend structure

The React frontend is structured by responsibilities:

- `src/pages/`: route-level feature pages
- `src/components/`: reusable UI and domain widgets
- `src/context/`: app-level state providers (portfolio context)
- `src/services/`: API client wrappers
- `src/hooks/`: reusable behavior hooks
- `src/layout/`: shell layout and navigation

### UI behavior model
- Router-driven page composition
- Session-aware redirects and lock state
- API-first data loading with local view state
- Focus on readable intelligence summaries and operational workflows

## 4) Data model overview

FinanceOS persists financial entities in MongoDB collections. Major data categories include:

- **User/security**: user credentials, authentication material, security settings
- **Portfolio data**: holdings and broker sync state
- **Account modules**: fixed deposits, EPF, NPS, PPF, cash accounts
- **Real-world assets**: physical commodities, assets, liabilities
- **Goals**: target amount, target timeline, progress state
- **Audit and operations**: audit logs, backup metadata

Data models are intentionally modular so each domain can evolve with minimal coupling.

## 5) Intelligence engine

FinanceOS intelligence is implemented as backend services that aggregate and compute from portfolio and account data.

### Current intelligence capabilities
- Net worth aggregation
- Category allocation summary and drift analysis
- Goal risk detection and recovery suggestions
- Opportunity evaluation based on market-drop scenarios

### Design principles
- Deterministic service computations
- Configurable strategy values
- API exposure as consumable summaries for dashboard UX

## 6) Snapshot-based portfolio ingestion

Portfolio ingestion uses a **snapshot-oriented** model to keep imported states auditable and analyzable over time.

### Ingestion flow
1. Broker sync or file import provides source holdings.
2. Source rows are normalized into canonical holding structures.
3. A portfolio snapshot is persisted to represent the imported state.
4. Intelligence services recompute derived metrics from normalized data.
5. UI refresh events surface updated net worth, drift, and goal impacts.

### Why snapshots
- Preserves historical states for timeline analysis.
- Improves debugging and reconciliation for imports.
- Enables future features like portfolio playback and trend intelligence.

## 7) Deployment topology (today vs future)

### Today
- Local MongoDB
- Local backend process
- Local frontend process

### Planned
- Dockerized deployment profiles
- Optional managed database
- Hosted deployment variant with same open-source core
