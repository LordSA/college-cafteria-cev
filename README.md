# Cafteria — College Canteen Ordering & Management Platform

[![Phase](https://img.shields.io/badge/Phase-2%20Auth%20%26%20Security-emerald.svg)](docs/authentication.md)
[![Customer](https://img.shields.io/badge/Customer-Next.js%20(Port%203000)-blue.svg)](customer)
[![Admin](https://img.shields.io/badge/Admin-Next.js%20(Port%203001)-indigo.svg)](admin)
[![Backend](https://img.shields.io/badge/Backend-Hono%20%2B%20Cloudflare%20(Port%208787)-orange.svg)](backend)

Cafteria is a modern, full-stack digital canteen platform for college campuses. It enables students and faculty to browse daily food menus, pre-order meals between classes, skip physical queues, and pay securely, while providing canteen staff and management with real-time kitchen displays and inventory tracking.

For deep architectural details, see [docs/architecture.md](docs/architecture.md).
For authentication, database schema, and RLS policies, see [docs/authentication.md](docs/authentication.md).

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
│   ├── src/                  # Hono routing, logging, error handling
│   ├── wrangler.toml         # Cloudflare Worker & Port 8787 dev config
│   ├── .dev.vars.example     # Environment variable template
│   └── package.json          # Worker scripts
│
├── docs/
│   ├── architecture.md       # Full architecture specification
│   ├── design_customer.md    # Customer App mobile-first design system
│   ├── design_admin.md       # Admin & Kitchen Display System (KDS) design system
│   ├── api.md                # Cloudflare Worker REST API specification
│   └── agent_rules.md        # Mirror of strict rules for agents and developers
│
├── AGENTS.md                 # Strict rules for AI agents and human developers
├── project_memory.md         # Persistent memory & file/schema registry
├── design.md                 # Unified design manifesto and theme index
├── changelogs.md             # Chronological platform change history
├── .gitignore                # Root gitignore for all applications
└── README.md                 # Primary project documentation
```

---

## Documentation & Developer Directives

Before modifying this repository, all developers and automated agents **MUST** review:
- [AGENTS.md](AGENTS.md): Strict rules on comment removal, Next.js caveats, and doc syncing.
- [project_memory.md](project_memory.md): System memory, component index, and architectural contracts.
- [design.md](design.md): Unified design philosophy and links to [Customer](docs/design_customer.md) & [Admin](docs/design_admin.md) design systems.
- [changelogs.md](changelogs.md): Chronological modification log.


---

## 2. Technology Stack

| Application | Framework / Runtime | Language | Styling / Validation | Target Platform | Local Port |
|---|---|---|---|---|---|
| **Customer** | Next.js 14 (App Router) | TypeScript (Strict) | Tailwind CSS | Cloudflare Pages (Static Export) | `3000` |
| **Admin** | Next.js 14 (App Router) | TypeScript (Strict) | Tailwind CSS | Cloudflare Pages (Static Export) | `3001` |
| **Backend** | Hono | TypeScript (Strict) | Zod | Cloudflare Workers | `8787` |

---

## 3. Communication & Architecture Rules

1. **Strictly Decoupled:** Neither Next.js app implements business logic or Next.js server API routes (`/api/*`).
2. **REST API:** All communication routes to the backend under `/api/v1` and `/health`.
3. **CORS Protected:** The backend dynamically authorizes requests based on the `ALLOWED_ORIGINS` environment binding.
4. **Sanitized Logs:** Sensitive headers (`Authorization`, `Cookie`, `X-Api-Key`, etc.) and sensitive query parameters are redacted before logging.
5. **Static Export:** Both frontends use `output: 'export'` with unoptimized images for Cloudflare Pages compatibility.

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

#### 3. Admin Dashboard (Port 3001)
```bash
cd admin
npm run dev
```
* Local URL: [http://localhost:3001](http://localhost:3001)

---

## 5. Verification Commands

Run type-checking, automated unit tests, and production builds for each project:

```bash
# Backend Typecheck & Auth Tests
cd backend
npm run typecheck
npm run test

# Customer (Static Export)
cd ../customer
npm run typecheck
npm run build

# Admin (Static Export)
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
* **Phase 3: Catalog & Database Engine** *(Upcoming)*
  - Supabase PostgreSQL schema, categories, items, meal slots, Zod validation schemas.
* **Phase 4: Order Lifecycle & Kitchen Display System (KDS)** *(Upcoming)*
  - State machine order management, token generation, kitchen order queue.
* **Phase 5: Cloudflare R2 Media Management** *(Upcoming)*
  - Signed image uploads and CDN caching for menu item photos.
* **Phase 6: Payments & Settlements** *(Upcoming)*
  - Razorpay order creation, payment signatures, and daily sales auditing.