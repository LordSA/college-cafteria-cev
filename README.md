# Cafteria — College Canteen Ordering & Management Platform

[![Phase](https://img.shields.io/badge/Phase-4.2%20Strict%20Order%20Stages%20%26%20QR%20Lifecycle-emerald.svg)](docs/order-lifecycle.md)
[![Customer](https://img.shields.io/badge/Customer-Next.js%20(Port%203000)-blue.svg)](customer)
[![Admin](https://img.shields.io/badge/Admin-Next.js%20(Port%203001)-indigo.svg)](admin)
[![Backend](https://img.shields.io/badge/Backend-Hono%20%2B%20Cloudflare%20(Port%208787)-orange.svg)](backend)

Cafteria is a modern, full-stack digital canteen platform for college campuses. It enables students and faculty to browse daily food menus, pre-order meals between classes, skip physical queues, and pay securely, while providing canteen staff and management with real-time kitchen displays, inventory tracking, staff verification, testing wallets, and QR collection passes.

For deep architectural details, see [docs/architecture.md](docs/architecture.md).  
For authentication and RLS policies, see [docs/authentication.md](docs/authentication.md).  
For staff verification workflows, see [docs/staff-approval.md](docs/staff-approval.md).  
For menu management and pricing, see [docs/menu-management.md](docs/menu-management.md).  
For storage provider architecture and Cloudflare R2 migration, see [docs/storage.md](docs/storage.md).  
For strict 3-stage order lifecycle, QR invalidation, and verification walkthrough, see [docs/order-lifecycle.md](docs/order-lifecycle.md).  
For order lifecycle, state machine, and concurrency control, see [docs/orders.md](docs/orders.md).  
For inventory depletion, threshold alerts, and cancellation restoration, see [docs/inventory.md](docs/inventory.md).  
For shopping cart persistence and checkout boundaries, see [docs/cart-and-checkout.md](docs/cart-and-checkout.md).  
For testing wallet demo credits and auditable transactions, see [docs/testing-wallet.md](docs/testing-wallet.md).  
For QR order verification, counter collection, and receipts, see [docs/qr-verification.md](docs/qr-verification.md).  

---

## 1. Project Structure

The repository contains three independent applications with zero monorepo workspace baggage:

```
college-canteen-cev/
├── customer/                 # Customer-facing Next.js App Router application
│   ├── src/                  # App components and layout
│   ├── next.config.mjs       # Static export configuration (output: 'export')
│   ├── .env.example          # Environment variable template
│   └── package.json          # Port 3000 dev scripts
│
├── admin/                    # Management & Kitchen Operations Next.js dashboard
│   ├── src/                  # App components and layout
│   ├── next.config.mjs       # Static export configuration (output: 'export')
│   ├── .env.example          # Environment variable template
│   └── package.json          # Port 3001 dev scripts
│
├── backend/                  # Dedicated REST API on Cloudflare Workers
│   ├── src/                  # Hono routing, logging, storage, error handling
│   ├── wrangler.toml         # Cloudflare Worker & Port 8787 dev config
│   ├── .dev.vars.example     # Environment variable template
│   └── package.json          # Worker scripts
│
├── supabase/migrations/      # Versioned PostgreSQL migrations for Supabase CLI
├── docs/                     # Specifications and design systems
├── AGENTS.md                 # Strict rules for AI agents and human developers
├── project_memory.md         # Persistent memory & file/schema registry
├── design.md                 # Unified design manifesto and theme index
├── changelogs.md             # Chronological platform change history
├── .gitignore                # Root gitignore for all applications
└── README.md                 # Primary project documentation
```

---

## 2. Storage Provider Architecture

Due to a temporary account configuration issue with Cloudflare R2, Cafteria utilizes **Supabase Storage** as the active temporary storage provider:
- **Active Temporary Provider:** Supabase Storage (`STORAGE_PROVIDER=supabase`)
- **Preserved Future Provider:** Cloudflare R2 (`STORAGE_PROVIDER=r2`)
- **Buckets:**
  - `food-images`: Public read access, restricted to authorized administrators for uploads.
  - `profile-images`: Private by default with short-lived signed URLs, scoped to the authenticated user.

Frontends communicate exclusively with backend REST endpoints (`/api/v1/uploads/*`) and remain 100% provider-agnostic. When R2 is activated later, zero frontend changes are required. See [docs/storage.md](docs/storage.md) for step-by-step instructions.

---

## 3. Technology Stack

| Application | Framework / Runtime | Language | Styling / Validation | Target Platform | Local Port |
|---|---|---|---|---|---|
| **Customer** | Next.js 14 (App Router) | TypeScript (Strict) | Tailwind CSS | Cloudflare Pages (Static Export) | `3000` |
| **Admin** | Next.js 14 (App Router) | TypeScript (Strict) | Tailwind CSS | Cloudflare Pages (Static Export) | `3001` |
| **Backend** | Hono | TypeScript (Strict) | Zod | Cloudflare Workers | `8787` |

---

## 4. Getting Started & Local Development

### Prerequisites
* Node.js v18.0.0+ (Tested on v22.x)
* npm v9.0.0+

### Setup Environment Files

Copy the provided environment templates:

```bash
# Customer Frontend
cp customer/.env.example customer/.env.local

# Admin Frontend
cp admin/.env.example admin/.env.local

# Backend API
cp backend/.dev.vars.example backend/.dev.vars
```

### Install Dependencies

Install dependencies inside each isolated application:

```bash
# Backend
cd backend && npm install && cd ..

# Customer
cd customer && npm install && cd ..

# Admin
cd admin && npm install && cd ..
```

### Running Applications Locally

Run each service in a separate terminal:

#### 1. Backend REST API (Port 8787)
```bash
cd backend
npm run dev
```
* Health Endpoint: [http://localhost:8787/health](http://localhost:8787/health)
* API v1 Root: [http://localhost:8787/api/v1](http://localhost:8787/api/v1)

#### 2. Customer Application (Port 3000)
```bash
cd customer
npm run dev
```
* Local URL: [http://localhost:3000](http://localhost:3000)
* Menu & Cart: [http://localhost:3000/menu](http://localhost:3000/menu)
* Cart: [http://localhost:3000/cart](http://localhost:3000/cart)
* Checkout: [http://localhost:3000/checkout](http://localhost:3000/checkout)
* Testing Wallet: [http://localhost:3000/wallet](http://localhost:3000/wallet)
* Orders Record: [http://localhost:3000/orders](http://localhost:3000/orders)

#### 3. Admin Dashboard (Port 3001)
```bash
cd admin
npm run dev
```
* Local URL: [http://localhost:3001](http://localhost:3001)
* Orders Queue: [http://localhost:3001/orders](http://localhost:3001/orders)
* QR Scanner & Collection: [http://localhost:3001/scan](http://localhost:3001/scan)
* Testing Wallets: [http://localhost:3001/wallets](http://localhost:3001/wallets)
* Inventory: [http://localhost:3001/inventory](http://localhost:3001/inventory)
* Menu Management: [http://localhost:3001/menu](http://localhost:3001/menu)
* Staff Requests: [http://localhost:3001/staff-requests](http://localhost:3001/staff-requests)

---

## 5. Verification Commands

Run type-checking, automated unit tests, and production builds for each project:

```bash
# Backend Typecheck & Tests (76 Passing Tests)
cd backend
npm run typecheck
npm run test

# Customer (Static Export - 18/18 Pages)
cd ../customer
npm run typecheck
npm run build

# Admin (Static Export - 16/16 Pages)
cd ../admin
npm run typecheck
npm run build
```

---

## 6. Phased Implementation Roadmap

* **Phase 1: Project Foundation** *(Completed)*
  - Independent app scaffolding, ports (`3000`, `3001`, `8787`), static export setup, Hono backend with logging, CORS, `/health`, `/api/v1`.
* **Phase 2: Authentication & Database Security** *(Completed)*
  - Supabase Auth integration, PostgreSQL `public.profiles` schema with triggers, RLS policies, Hono Bearer token verification middleware (`requireAuth`), admin middleware (`requireAdmin`), customer `/login`, `/signup`, `/profile` pages, admin `/login`, `/unauthorized`, and operations dashboard.
* **Phase 3: Menu Engine, Staff Approval & Storage** *(Completed)*
  - Categories, menu items, integer paise pricing, availability toggles (86), staff approval review board, OTP email verification, password recovery, temporary Supabase Storage provider with preserved Cloudflare R2 support.
* **Phase 4: Cart, Order Management & Inventory Control** *(Completed)*
  - Client-side persistent cart (`localStorage`), server-authoritative order placement, human-readable order numbers, atomic PostgreSQL inventory deduction & cancellation restoration, live status progression (`pending` -> `confirmed` -> `preparing` -> `ready_for_pickup` -> `completed`), kitchen order dispatch dashboard, inventory management with low-stock alerts and 86 toggles.
* **Phase 4.1: Testing Wallet, QR Order Verification & Bill Printing** *(Completed)*
  - Non-monetary testing wallet with auditable ledger for demo credits (strictly labeled: "Testing Wallet — Demo Credits Only. No Real Money."). Admin-controlled demo credit/debit adjustments with mandatory audit reason and negative balance prevention. Cryptographically secure QR verification tokens (`CAF-QR-XXXXXX`) generated upon payment. Counter pickup SVG QR pass on customer success and tracking screens. Admin camera scanner and manual fallback (`/scan`) with 1-click atomic order collection. High-contrast, thermal/inkjet print-ready receipts (`@media print`) on customer and admin apps.
* **Phase 4.2: Strict Order Stages, QR Lifecycle & Collection Flow** *(Completed)*
  - Strict 3-stage order progression (`ORDER_PLACED` -> `READY_TO_PICK` -> `COLLECTED`). Non-mutating pre-flight verification on QR scan returning stage eligibility and ineligibility reasons (`"Order is not ready for pickup yet"` or `"Order already collected"`). Explicit admin confirmation required before collection. Atomic collection updating `qr_consumed_at = now()`, permanently expiring QR tokens and preventing duplicate collections. Customer tracking and receipt UI with stage-based QR invalidation.
* **Phase 5: Payments & Settlements** *(Upcoming)*
  - Razorpay checkout integration, webhook signature validation, unpaid -> paid status transition.
* **Phase 6: Auditing & Financial Analytics** *(Upcoming)*
  - End-of-day financial reconciliation, peak rush traffic heatmaps, and payout settlement auditing.
