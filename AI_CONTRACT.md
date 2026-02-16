# FinanceOS – AI Contract

## Project Vision
FinanceOS is an open-source personal portfolio aggregation engine.
It aggregates transactions from multiple brokers using adapters and builds a unified ledger-based source of truth.

No paid APIs.
No broker lock-in.
Ledger-first architecture.

---

## Core Principles

1. Ledger-first system (immutable transactions).
2. Adapter-based import layer.
3. Provider-agnostic price engine.
4. Holdings are derived from transactions.
5. Snapshot is computed, never manually edited.
6. Modular and open-source friendly structure.

---

## Tech Stack

- Node.js
- Express
- MongoDB
- Modular folder structure
- No UI in v1 (API only)

---

## Modules to Build

- core/
  - ledger engine
  - holdings calculator
  - XIRR calculator

- adapters/
  - manual JSON importer (v1)
  - CAS parser (v2)

- prices/
  - equity price provider
  - mutual fund NAV provider

- api/
  - portfolio routes
  - holdings routes
  - performance routes

---

## Development Rules for AI

- Keep modules small and independent.
- No business logic inside routes.
- Keep DB models separate from logic.
- Use service-layer pattern.
- Avoid over-engineering.
- Keep code readable and production-ready.
