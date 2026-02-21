# FinanceOS

FinanceOS is an open-source finance platform with:
- A Node.js/Express API for imports, transactions, portfolio, and pricing
- A React + Vite dashboard UI in `financeos-ui/`

## Repository Structure

```
.
|-- api/
|-- config/
|-- core/
|-- models/
|-- prices/
|-- scripts/
|-- tests/
|-- financeos-ui/
|-- app.js
|-- server.js
```

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB (local or remote)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

- Copy `.env.example` to `.env`
- Copy `financeos-ui/.env.example` to `financeos-ui/.env`

3. Run backend API:

```bash
npm run dev:api
```

4. Run frontend UI in a second terminal:

```bash
npm run dev:web
```

## Scripts

- `npm run dev:api` - Start backend in watch mode
- `npm run test:api` - Run backend test suite
- `npm run db:clean:transactions` - Cleanup transaction collection
- `npm run dev:web` - Start frontend dev server
- `npm run build:web` - Build frontend
- `npm run preview:web` - Preview frontend production build

## Environment Variables

Backend variables are documented in `.env.example`.

Frontend:
- `VITE_API_URL` - Base URL for backend API (see `financeos-ui/.env.example`)

## Open Source Standards

- `LICENSE` - MIT license
- `CONTRIBUTING.md` - Contribution workflow
- `CODE_OF_CONDUCT.md` - Community behavior standards
- `SECURITY.md` - Security disclosure policy
