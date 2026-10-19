# Cafteria Architecture & Technical Specification

> **Phase 1: Project Foundation**
>
> Cafteria is a modern, full-stack digital canteen ordering and management platform tailored for college campuses.

---

## 1. System Overview

Cafteria decouples frontend experiences from backend business logic by maintaining three completely independent applications within a single repository structure:

```
college-canteen-cev/
├── customer/     # Customer-facing static Next.js web application (Port 3000)
├── admin/        # Management & kitchen operations Next.js dashboard (Port 3001)
├── backend/      # Dedicated REST API powered by Hono on Cloudflare Workers (Port 8787)
└── docs/         # System architecture and implementation documentation
```

### Key Architectural Tenets
1. **Zero Monorepo Clutter:** No workspace frameworks (Turborepo, Nx, Lerna, npm/yarn/pnpm workspaces) to avoid configuration drift and leaky dependencies. Each application has isolated dependencies and its own `package.json` and `tsconfig.json`.
2. **Strict Separation of Concerns:** Neither frontend implements business logic or Next.js server-side API routes (`/api/*`). All reads, writes, transactions, and privileged actions route exclusively through the backend API.
3. **Edge Performance & Static Export:** Both frontends are pre-compiled into static HTML/CSS/JS (`output: 'export'`) optimized for deployment onto **Cloudflare Pages**. Dynamic execution happens on **Cloudflare Workers**.
4. **Environment Isolation:** Backend endpoints are dynamically injected through environment variables (`NEXT_PUBLIC_API_URL`), enabling trivial switching between local development, staging, and production.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Client Tier ["Client Applications (Cloudflare Pages)"]
        CustomerApp["Customer Web App\n(Next.js App Router / Port 3000)\n- Static Export\n- Student/Faculty Ordering"]
        AdminApp["Admin Dashboard\n(Next.js App Router / Port 3001)\n- Static Export\n- Kitchen/Staff Operations"]
    end

    subgraph Edge API Tier ["Edge API Tier (Cloudflare Workers)"]
        BackendWorker["Backend REST API\n(Hono + Zod / Port 8787)\n- Route Handling\n- Sanitized Logging\n- Dynamic CORS\n- Centralized Error Handler"]
    end

    subgraph Future Services ["Future Infrastructure (Phases 2-6)"]
        SupabaseAuth["Supabase Auth\n(JWT & RBAC)"]
        SupabaseDB["Supabase PostgreSQL\n(Menu, Orders, Ledger)"]
        CloudflareR2["Cloudflare R2\n(Menu Item Images)"]
        Razorpay["Razorpay Gateway\n(UPI / Card Payments)"]
    end

    CustomerApp -->|"REST HTTPS /api/v1"| BackendWorker
    AdminApp -->|"REST HTTPS /api/v1 (Auth Bearer)"| BackendWorker

    BackendWorker -.->|"Phase 2"| SupabaseAuth
    BackendWorker -.->|"Phase 2 & 3"| SupabaseDB
    BackendWorker -.->|"Phase 5"| CloudflareR2
    BackendWorker -.->|"Phase 6"| Razorpay
```

---

## 3. Application Responsibilities

### 3.1 Customer Application (`customer/`)
* **Role:** Student and faculty public interface for discovering food, scheduling pre-orders, and checking out.
* **Technology:** Next.js (App Router), TypeScript (strict mode), Tailwind CSS, Lucide React.
* **Hosting Target:** Cloudflare Pages (Static Export via `output: 'export'`).
* **Port (Dev):** `http://localhost:3000`
* **Responsibilities:**
  - Responsive, mobile-first ordering UI.
  - Live menu browsing with category filtering and real-time availability badges (Upcoming).
  - Cart state and scheduled pickup interval selection (Upcoming).
  - Razorpay payment initiation and student order tracking (Upcoming).
  - Direct consumption of backend endpoints via `fetch()` using `NEXT_PUBLIC_API_URL`.

### 3.2 Admin Application (`admin/`)
* **Role:** Back-office portal for canteen management, kitchen operators, cashier counters, and college administration.
* **Technology:** Next.js (App Router), TypeScript (strict mode), Tailwind CSS, Lucide React.
* **Hosting Target:** Cloudflare Pages (Static Export via `output: 'export'`).
* **Port (Dev):** `http://localhost:3001`
* **Responsibilities:**
  - Secure operational dashboard (locked until authentication is introduced in Phase 2).
  - Real-time Kitchen Display System (KDS) order dispatch queue (Upcoming).
  - Menu catalog management (item toggling, pricing, meal slots) (Upcoming).
  - Inventory alerts and daily sales reconciliation (Upcoming).
  - Zero privileged business logic in client code; all state transitions are authorized and executed by the backend.

### 3.3 Backend API (`backend/`)
* **Role:** The single source of truth for all data access, validation, business rules, and external integrations.
* **Technology:** Hono framework, TypeScript (strict mode), Cloudflare Workers, Wrangler, Zod.
* **Hosting Target:** Cloudflare Workers (Global Edge Network).
* **Port (Dev):** `http://localhost:8787`
* **Responsibilities:**
  - High-performance, edge-rendered RESTful API under `/api/v1`.
  - Strict input validation using Zod schemas (`@hono/zod-validator`).
  - Dynamic CORS header injection matching configured client origins.
  - Centralized error handling returning structured JSON errors.
  - Sanitized request logging (redacting sensitive authorization headers, tokens, and cookies).
  - Health checks (`GET /health`) executable with zero external credentials.

---

## 4. Communication & Networking

### Protocols & Data Formats
* **Format:** All API payloads and responses are standardized JSON.
* **Base Path:** Business logic endpoints reside under `/api/v1`.
* **Root Health Check:** `GET /health` returns operational health metrics without requiring database connectivity:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-19T18:00:00.000Z",
    "service": "cafteria-backend",
    "version": "1.0.0",
    "environment": "development"
  }
  ```
* **API Metadata:** `GET /api/v1` returns API versioning and directory information:
  ```json
  {
    "name": "Cafteria REST API",
    "version": "1.0.0",
    "status": "active",
    "phase": "Phase 1 - Project Foundation",
    "endpoints": {
      "health": "/health",
      "apiV1": "/api/v1"
    }
  }
  ```

### Cross-Origin Resource Sharing (CORS)
The backend reads the `ALLOWED_ORIGINS` environment variable (comma-separated):
```ini
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```
In incoming requests, Hono matches the `Origin` header against the allowlist and responds with corresponding `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`.

---

## 5. Environment Variables & Secret Management

All environment variables follow strict 12-factor principles. Never commit secrets, service keys, or database credentials to version control.

### Templates Summary
| Application | Template File | Local Development Target | Description |
|---|---|---|---|
| `customer/` | `.env.example` | `.env.local` | Public API URL (`NEXT_PUBLIC_API_URL`) |
| `admin/` | `.env.example` | `.env.local` | Public API URL (`NEXT_PUBLIC_API_URL`) |
| `backend/` | `.dev.vars.example` | `.dev.vars` | Cloudflare Workers local environment bindings |

### Sample Environment Declarations

#### Frontends (`customer/.env.example` & `admin/.env.example`)
```ini
# Base URL of the dedicated backend REST API
NEXT_PUBLIC_API_URL=http://localhost:8787
```

#### Backend (`backend/.dev.vars.example`)
```ini
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Upcoming Phase Integrations
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# RAZORPAY_KEY_ID=rzp_test_placeholder
# RAZORPAY_KEY_SECRET=placeholder_secret
```

---

## 6. Deployment Assumptions

### Static Frontends (Cloudflare Pages)
* Built using `next build` with `output: 'export'` configured in `next.config.mjs`.
* Output artifacts reside in the respective `out/` folder.
* Hosted as static assets on Cloudflare's global CDN with zero server-side Node.js runtime overhead.
* Route navigation handled via client-side routing with clean HTML fallbacks.

### Dedicated Backend (Cloudflare Workers)
* Deployed via Wrangler CLI (`wrangler deploy`).
* Compliant with standard Cloudflare Worker V8 runtime (`compatibility_flags = ["nodejs_compat"]`).
* Production secrets configured using `wrangler secret put <KEY>`.

---

## 7. Security Constraints & Phased Roadmap

### Current Phase (Phase 1: Project Foundation)
* [x] Three independent applications with distinct dependency trees.
* [x] Static exports enabled for both frontends.
* [x] Port bindings isolated (`3000`, `3001`, `8787`).
* [x] Sanitized logger preventing credential and cookie leakage in logs.
* [x] CORS protection with dynamic origin evaluation.
* [x] Health check operational without third-party services.
* [x] Zero business logic exposed in Next.js routes.

### Upcoming Phases
* **Phase 2: Authentication & RBAC (Supabase Auth)**
  - Implement Supabase Auth with email/password and college domain magic links.
  - Role-Based Access Control (`customer`, `canteen_staff`, `admin`).
  - Hono JWT verification middleware.
* **Phase 3: Database Models & Catalog Management (Supabase PostgreSQL)**
  - Schema migrations for canteen stalls, menu items, categories, meal slots, and pricing.
  - Zod validation schemas for all CRUD payloads.
* **Phase 4: Order Lifecycle & Kitchen Display System (KDS)**
  - Order state machine (`PENDING`, `CONFIRMED`, `COOKING`, `READY`, `COLLECTED`, `CANCELLED`).
  - Token generation and verification algorithms.
* **Phase 5: Cloudflare R2 Media Management**
  - Secure signed upload URLs for canteen menu images.
* **Phase 6: Razorpay Payment Integration & Settlement Engine**
  - Payment order creation, webhook verification, and automated refund handling.
