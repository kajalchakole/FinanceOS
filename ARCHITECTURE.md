# FinanceOS Architecture

## High-Level Flow

Import → Normalize → Append Ledger → Recompute Holdings → Compute Analytics → Serve API

---

## System Components

### 1. Adapters
Responsible for ingesting data from various sources.

Examples:
- manual-json
- cas-parser (future)
- broker-csv (future)

Adapters output normalized transactions.

---

### 2. Normalization Layer
- Validates data
- Maps ISIN
- Standardizes transaction format

---

### 3. Ledger Engine
- Immutable transaction storage
- Supports BUY, SELL, DIVIDEND, SPLIT
- Rebuildable positions

---

### 4. Holdings Snapshot
- Derived from ledger
- Quantity
- Average cost
- Realized PnL
- Unrealized PnL

---

### 5. Price Engine
- Equity price provider
- MF NAV provider
- Scheduled updates

---

### 6. Analytics Layer
- XIRR
- CAGR
- Asset allocation
- Broker split

---

### 7. REST API
Endpoints:

GET /portfolio
GET /holdings
GET /allocation
GET /performance

---

## Folder Structure

core/
adapters/
prices/
analytics/
api/
models/
config/

---

## Design Philosophy

- Event-friendly
- Adapter-pluggable
- Ledger-first
- Snapshot derived
- Price-provider swappable
