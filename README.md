# FinanceOS

FinanceOS is a self-hosted personal **Wealth Operating System** for people who want one private place to manage their full financial life.

It combines investment tracking, real-world assets, liabilities, retirement accounts, and goal planning with practical intelligence features like allocation drift detection and opportunity analysis.

## Why FinanceOS exists

Most personal finance products optimize for growth through ads, upsells, and data extraction. FinanceOS takes the opposite approach:

- **Self-hosted first**: you own the runtime and your data.
- **Privacy focused**: no surveillance business model.
- **Single-user architecture**: built for an individual or household operator.
- **Modular by design**: feature modules evolve independently.
- **Broker-agnostic inputs**: sync APIs where possible, file imports where needed.
- **Open-source core**: transparent and community-improvable.

## Features

### Financial operating cockpit
- Dashboard intelligence for net worth, allocation, and goal health.
- Portfolio tracking across financial instruments and accounts.
- Holdings management with create/edit workflows.

### Asset and liability tracking
- Cash accounts.
- Physical commodities.
- Generic assets and liabilities.
- Retirement and long-term products: **EPF, NPS, PPF, Fixed Deposits**.

### Goal and intelligence workflows
- Goal planning and tracking.
- Allocation analysis and drift-based rebalance actions.
- Opportunity detection (market drop + deployable fund evaluation).

### Data connectivity and resilience
- Broker sync center (connect/reconnect + sync).
- Broker file imports for supported brokers.
- Backup and restore workflows.
- Security logs and account hardening.

### Authentication and recovery
- PIN and password login.
- Recovery key generation and account recovery.
- Session management with auto-lock behavior.

## Screenshots

> Add screenshots and GIF walkthroughs before first public launch.

- `docs/screenshots/dashboard.png` (placeholder)
- `docs/screenshots/portfolio.png` (placeholder)
- `docs/screenshots/goals.png` (placeholder)
- `docs/screenshots/broker-sync.png` (placeholder)

## Installation (local setup)

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB 6+

### 1) Clone the repository
```bash
git clone https://github.com/<your-org>/FinanceOS.git
cd FinanceOS
```

### 2) Start MongoDB
Run MongoDB locally (for example with `mongod`) and keep the URI ready.

### 3) Configure backend
```bash
cd backend
cp .env.example .env
```
Update `.env` values such as:
- `MONGO_URI`
- `PORT`
- auth and encryption related secrets
- optional broker credentials

### 4) Install backend dependencies and run
```bash
npm install
npm run dev
```
Backend runs by default at `http://localhost:5000`.

### 5) Configure frontend
In a second terminal:
```bash
cd frontend
cp .env.example .env
```
Set:
- `VITE_API_BASE_URL=/api` (for proxy-based local dev) or full backend URL.

### 6) Install frontend dependencies and run
```bash
npm install
npm run dev
```
Frontend runs by default at `http://localhost:5173`.

## Development setup

### Suggested workflow
1. Run backend and frontend in separate terminals.
2. Keep MongoDB running locally.
3. Use feature branches for all changes.
4. Add or update tests with every behavior change.
5. Keep docs in sync with module additions.

### Project structure
- `backend/` — Node.js + Express APIs and business services
- `frontend/` — React UI
- `README/` — supplemental docs and contracts

For deeper system design, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for near-term and long-term milestones, including Dockerized deployment, advanced intelligence modules, and plugin architecture.

## Contributing

Contributions are welcome. Start with:
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)

## License

FinanceOS is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

- It is **open source**.
- It is **self-host friendly** for individuals and teams running their own instance.
- AGPL helps **protect community contributions**, including changes used over a network.
- A **commercial license may be available in the future** for organizations that need proprietary embedding or non-AGPL hosted-service terms.

See [LICENSE](./LICENSE) for the full license text and [LICENSING.md](./LICENSING.md) for details.
