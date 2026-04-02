# Entrupy Price Monitoring System

> A full-stack system that collects product listings from multiple resale marketplaces, tracks price changes over time, and surfaces analytics and alerts through a clean React dashboard.

---

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Design Decisions](#design-decisions)
- [Tradeoffs](#tradeoffs)
- [Testing](#testing)
- [Known Limitations](#known-limitations)
- [UI Overview](#ui-overview)

---

## Architecture

<!-- ```
Grailed      ─┐
Fashionphile  ─┼──► Collectors ──► Normalizer ──► PostgreSQL ──► FastAPI ──► React UI ──► Alerts
1stDibs      ─┘                                                      │
                                                                API Key Auth
``` -->

<p align="center">
  <img src="./screenshots/flow.png" width="800">
</p>

Each marketplace has a dedicated collector. Raw data is normalized into a consistent schema (`NormalizedListing`) before storage. FastAPI exposes a RESTful API protected by API key authentication, which the React frontend consumes for dashboards, filtering, and price change alerts.

---

## Features

- Collects listings from **Grailed**, **Fashionphile**, and **1stDibs**
- Normalizes inconsistent marketplace schemas into a unified model
- Tracks **price history** over time with an append-only table
- Detects and surfaces **price changes** without storing duplicate rows
- REST API with filtering, analytics, and manual refresh
- API key authentication with per-key usage tracking
- React dashboard with price trend charts and instant change alerts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy |
| Database | PostgreSQL |
| Frontend | React + Vite |
| Testing | Pytest (9 tests) |

---

## Database Schema

The system uses four core tables:

| Table | Purpose |
|---|---|
| `products` | Unique physical items, deduplicated across marketplaces |
| `listings` | Source-specific entries linked to a product; stores current price and source name |
| `price_history` | Append-only log of every price change per listing, indexed by `(listing_id, observed_at)` |
| `api_keys` | Database-backed API keys with per-key usage tracking |

**Key design:** `products` and `listings` are kept separate because the same item can appear on multiple platforms. This makes cross-platform price comparison a native query rather than a workaround. The `price_history` table only ever appends — it never updates — preserving the complete change history while keeping the table lean.

---

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/entrupy
```

Start the server:

```bash
uvicorn app.main:app --reload
```

Generate an API key:

```
POST /api/auth/keys?name=your_name
```

---

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8000/api
VITE_API_KEY=your_key_here
```

> **Dev key:** `4fd490f17d842ed9fec40d381ad84514b504a3ef956ed0c4aca356808338d0be`

Start the frontend:

```bash
npm run dev
```

---

## API Reference

All endpoints require the following header:

```
x-api-key: YOUR_KEY
```

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/refresh` | Trigger a fresh data collection run |
| `GET` | `/api/products` | List and filter products |
| `GET` | `/api/products/{id}` | Get a single product with listing details |
| `GET` | `/api/products/{id}/price-history` | Full price history for a listing |
| `GET` | `/api/price-changes` | Recent price change events |
| `GET` | `/api/analytics` | Aggregated stats across all sources |

---

## Design Decisions

### 1. Product + Listing Separation

The same physical item can appear on multiple platforms. Keeping `products` unique and `listings` source-specific avoids duplication and makes cross-platform price comparison a native query rather than a workaround.

### 2. Append-only Price History

The `price_history` table never updates — it only appends. A new row is written only when the price actually changes, keeping the table lean without losing any history. Records are indexed by `(listing_id, observed_at)` for fast retrieval regardless of table size.

**Scalability path:** The natural next step is time-based partitioning — splitting the table by month so each query only touches the relevant partition. The current schema supports this without any structural changes.


### 3. Response-driven Price Change Notifications

When the user clicks Refresh, the backend returns the changed listings directly in the API response. The refresh button component reads those changes and pushes them into a React context. A banner component listens to that context and immediately renders an alert strip with a direct link to the affected product.

This is entirely response-driven — no polling, no WebSockets, no background jobs. Change events travel from the refresh response into React context and render instantly, with zero extra infrastructure.

**Why not polling?** Polling fires requests even when nothing has changed, resulting in unnecessary database load. **Why not WebSockets?** WebSockets add server-side connection management overhead. The refresh-driven approach keeps the entire notification flow tied to a user action — simpler, cheaper, and just as immediate.



### 4. API Key Authentication


A lightweight, database-backed API key mechanism with per-key usage tracking. Chosen for simplicity and effectiveness at the current scale. Can be extended with JWT-based authentication for improved security and scalability.

---



### How does your price history scale? What happens at millions of rows?
The price_history table uses an append-only design — rows are only ever inserted, never updated, so the complete history of every price change is always preserved.
To keep queries fast, the table has a composite index on (listing_id, observed_at). Fetching price history for any product stays efficient regardless of how many rows exist — Postgres uses the index directly without scanning the full table.
For future scale, the natural next step is time-based partitioning — splitting the table by month so each query only touches the relevant partition. The current schema supports this without any structural changes.

### How did you implement notification of price changes, and why that approach over alternatives?
When the user clicks Refresh, the backend loops through all listings, compares each listing's stored price against the incoming data, and writes a new price history record only when the price has actually changed. The changed items are returned directly in the refresh API response.
On the frontend, the refresh button reads those changes from the response and pushes them into a React context. A banner component listens to that context and immediately renders an alert strip showing what changed, with a direct link to the affected product.
This is entirely response-driven — no polling, no WebSockets, no background jobs. Change events travel directly from the refresh response into React context and render instantly, with zero extra infrastructure.
Polling was avoided because it fires requests even when nothing has changed, resulting in unnecessary database load. WebSockets were avoided because they add server-side connection management overhead. This approach keeps the entire notification flow tied to a user action — simpler, cheaper, and just as immediate.

### How would you extend this system to 100+ data sources?
The system is already structured to make this straightforward.
The NormalizedListing schema acts as a universal contract between any data source and the rest of the system. As long as a new collector outputs a valid NormalizedListing, nothing in the database layer, service layer, or API needs to change.
The normalizer uses a source-based registry pattern — each source gets its own normalization function, and adding a new source means adding one function and registering it, with no changes to existing code.
The listings table stores source as a plain string column, so new sources add rows, not schema changes. The logic for deduplication, price comparison, and history recording works identically regardless of source.
For parallelism, since each normalization call is stateless, the collection loop can be wrapped with asyncio or a thread pool to run all sources concurrently — keeping refresh time constant no matter how many sources are added.


## Tradeoffs

| Decision | Why | Improvement Path |
|---|---|---|
| API key in frontend `.env` | Simple dev setup; sufficient for a single-consumer system | JWT-based auth or a backend-for-frontend proxy that holds the key server-side |
| Synchronous data refresh | Works well for static JSON files; easy to debug | Webhooks from each marketplace to trigger DB updates in real time |
| Manual refresh + response-driven alerts | No background jobs or open connections needed | WebSockets or webhooks to push changes automatically without a manual trigger |
| PostgreSQL over SQLite | Better concurrency, indexing, and scalability for growing `price_history` data | Time-based table partitioning and read replicas as volume increases |
| No rate limiting | Kept focus on core functionality; usage is already tracked per key | Per-key rate limiting to prevent misuse and ensure fair access |

---

## Testing

9 Pytest unit tests covering:

- Product creation
- Listing creation
- Price change detection
- Edge cases (no change, missing data, division by zero)

---

## Known Limitations

- No real-time updates — price changes are only detected when a manual refresh is triggered
- API key is exposed in the frontend environment (dev setup only)
- No per-key rate limiting
- No background job processing — refresh is user-initiated, not scheduled

These are intentional tradeoffs to keep the system focused on core functionality. Each has a clear upgrade path documented in the tradeoffs table above.

---

## UI Overview

| View | What It Shows |
|---|---|
| **Dashboard** | Aggregated analytics and recent price changes |
| **Products** | Filterable listing grid across all sources |
| **Product Detail** | Full price history with trend visualization |

### Screenshots

## Screenshots

### Dashboard
![Dashboard](./screenshots/dashboard1.png)


![Dashboard](./screenshots/dashboard2.png)


![Dashboard](./screenshots/dashboard3.png)



### Notification banner --> When a price change occur

![Notification](./screenshots/notify.png)


### Product Page
![Products](./screenshots/products.png)


### Product Detail
![Product Detail](./screenshots/description.png)


![Product Detail](./screenshots/description2.png)