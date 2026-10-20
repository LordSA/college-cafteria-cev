# Project Memory — Cafteria Platform

> **Status:** Phase 2 (Authentication & Database Security) Complete  
> **Last Updated:** 2026-10-20  
> **Rule Requirement:** Developers and automated agents **MUST** read this document before making any changes and update it whenever files, schemas, endpoints, or conventions change.

---

## 1. System Overview

Cafteria is a full-stack digital canteen ordering and management platform purpose-built for college campuses. It enables students and faculty to browse daily menu items, order meals ahead, pay digitally, and pick up without physical queueing, while providing canteen staff with real-time kitchen operations and inventory controls.

### Architectural Structure
The repository contains **three completely decoupled, independent applications** without monorepo workspace baggage:

```
college-canteen-cev/
├── customer/                 # Port 3000: Next.js 14 App Router (Customer Ordering Web App)
├── admin/                    # Port 3001: Next.js 14 App Router (Staff & Kitchen Management)
├── backend/                  # Port 8787: Hono REST API on Cloudflare Workers
├── docs/                     # Technical specifications, design systems & rules
├── AGENTS.md                 # Strict operating rules for automated agents & developers
├── design.md                 # Unified design system index & cross-app guidelines
├── changelogs.md             # Chronological record of codebase modifications
├── project_memory.md         # Persistent system memory & file/function register
└── README.md                 # Primary repo guide & local development instructions
```

---

## 2. Application Architecture & File Register

### 2.1 Customer Application (`customer/`)
* **Role:** Student and faculty ordering portal.
* **Stack:** Next.js 14.2.24 (App Router), React 18, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`.
* **Target:** Cloudflare Pages (Static export via `output: 'export'`).
* **Dev Port:** `3000` (`http://localhost:3000`).
* **Environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Key Files:**
  - `src/app/layout.tsx`: Root HTML shell with `AuthProvider` wrapper.
  - `src/app/globals.css`: Base Tailwind directives and custom scrollbar resets.
  - `src/app/page.tsx`: Landing page showcasing platform value, phase status, and upcoming ordering preview.
  - `src/app/login/page.tsx`: Customer sign-in page with validation and redirect protection.
  - `src/app/signup/page.tsx`: Registration page with student/staff selector and safe customer default role.
  - `src/app/profile/page.tsx`: Protected profile management with server-enforced role locking.
  - `src/context/AuthContext.tsx`: Client authentication provider listening to Supabase session changes.
  - `src/lib/supabase.ts`: Singleton browser client for Supabase Auth.
  - `src/components/Header.tsx`: Navigation header with auth identity state and live API health indicator.
  - `src/components/Footer.tsx`: Minimal footer with status and campus copyright.
  - `src/components/ApiHealthBadge.tsx`: Client-side polling component testing connectivity to `/health`.
  - `tailwind.config.ts`: Configured with the warm amber food palette (`brand` color scale).
  - `next.config.mjs`: Configured with `output: 'export'`, trailing slashes, and unoptimized images.

### 2.2 Admin Application (`admin/`)
* **Role:** Management, kitchen order dispatch queue (KDS), cashier operations, and inventory reconciliation.
* **Stack:** Next.js 14.2.24 (App Router), React 18, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`.
* **Target:** Cloudflare Pages (Static export via `output: 'export'`).
* **Dev Port:** `3001` (`http://localhost:3001`).
* **Environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Key Files:**
  - `src/app/layout.tsx`: Root HTML shell for the back-office command center with `AdminAuthProvider`.
  - `src/app/globals.css`: Dark slate base styling.
  - `src/app/page.tsx`: Protected Operations Command Center displaying verified administrator identity.
  - `src/app/login/page.tsx`: Restricted admin sign-in (no public registration).
  - `src/app/unauthorized/page.tsx`: Access denied screen for non-admin accounts with redirect options.
  - `src/context/AdminAuthContext.tsx`: Admin session provider verifying role against `/api/v1/admin/me` and database.
  - `src/lib/supabase.ts`: Singleton browser client for Supabase Auth.
  - `src/components/Header.tsx`: Dark admin header with admin name badge, logout action, and API status.
  - `src/components/Footer.tsx`: Admin-level audit footer.
  - `src/components/ApiHealthBadge.tsx`: Health check polling badge against Cloudflare Worker API.
  - `tailwind.config.ts`: Configured with cool slate/indigo admin tokens (`admin` color scale).
  - `next.config.mjs`: Configured with `output: 'export'`, trailing slashes, and unoptimized images.

### 2.3 Backend API (`backend/`)
* **Role:** Single source of truth for database operations, authentication, orders, and payment integrations.
* **Stack:** Hono framework, TypeScript (Strict), Cloudflare Workers, Wrangler, Zod, Vitest.
* **Target:** Cloudflare Workers (Global Edge Network).
* **Dev Port:** `8787` (`http://localhost:8787`).
* **Configuration:** `wrangler.toml` and `.dev.vars`.
* **Key Files:**
  - `src/index.ts`: Primary Hono router, global middleware binding, route mounting, and 404/error handler.
  - `src/middleware/auth.ts`: Reusable `requireAuth` (Bearer token verification) and `requireAdmin` (RBAC) middlewares.
  - `src/middleware/cors.ts`: Dynamic CORS origin matching against `ALLOWED_ORIGINS` binding.
  - `src/middleware/logger.ts`: Sanitized JSON request logger redacting authorization headers and sensitive query parameters.
  - `src/middleware/error.ts`: Centralized error handling returning structured JSON envelopes.
  - `src/lib/supabase.ts`: Token verification and database profile retrieval via Supabase Admin/User clients.
  - `src/routes/health.ts`: Unauthenticated `/health` check reporting uptime, worker version, and timestamp.
  - `src/routes/api.ts`: `/api/v1` router mounting auth and admin endpoints.
  - `src/routes/auth.ts`: `GET /api/v1/auth/me` returning authenticated user profile.
  - `src/routes/admin.ts`: `GET /api/v1/admin/me` admin-only test endpoint returning verified admin identity.
  - `src/types/env.ts`: TypeScript environment and profile interfaces (`Env`, `UserProfile`, `AuthContextVariables`).
  - `tests/auth.test.ts`: Vitest suite covering 12 authentication, authorization, and role tampering test cases.
  - `migrations/0001_create_profiles.sql`: SQL migration for `public.profiles`, triggers, and RLS policies.

---

## 3. Communication & Decoupling Contracts

1. **No Next.js Server Routes:** Neither frontend is permitted to implement `/api/*` routes or server-side DB connections.
2. **Standard API Envelope:** All backend JSON responses follow standard schemas:
   - Success: `{ "success": true, "data": { ... }, "timestamp": "..." }`
   - Error: `{ "success": false, "error": { "code": "...", "message": "..." }, "timestamp": "..." }`
3. **Dynamic CORS:** Only origins listed in `ALLOWED_ORIGINS` (comma-separated, e.g. `http://localhost:3000,http://localhost:3001`) are granted `Access-Control-Allow-Origin`.
4. **Log Sanitization:** Sensitive headers (`Authorization`, `Cookie`, `X-Api-Key`, `X-Webhook-Signature`) are systematically replaced with `[REDACTED]` before printing.
5. **Zero-Trust Role Enforcement:** Roles are resolved exclusively from the verified database record; browser metadata is ignored.

---

## 4. Phase Implementation Tracker

| Phase | Title | Status | Scope |
|---|---|---|---|
| **Phase 1** | Project Foundation | **Completed** | Decoupled client scaffolding, static exports, Hono Worker API, CORS, logging, health probes. |
| **Phase 2** | Authentication & RBAC | **Completed** | Supabase Auth, `public.profiles` schema, RLS policies, Hono `requireAuth` & `requireAdmin`, customer login/signup/profile, admin login/unauthorized/dashboard. |
| **Phase 3** | Menu & Catalog Engine | Planned | PostgreSQL schema, categories, items, availability toggles, meal slot filters. |
| **Phase 4** | Order Lifecycle & KDS | Planned | State machine order pipeline, token generation, kitchen live ticket board. |
| **Phase 5** | Media Management | Planned | Cloudflare R2 bucket integration, pre-signed upload URLs, CDN caching. |
| **Phase 6** | Payments & Settlement | Planned | Razorpay checkout, webhook signature validation, daily financial reconciliation. |

---

## 5. Strict Zero-Comment Mandate in Source Code

Whenever modifying source files in this repository:
1. **Never leave developer or agent commentary** (`// explanation`, `/* block */`, `{/* JSX */}`).
2. **Delete file headers** like `// src/app/page.tsx`.
3. **Only preserve tool-required comments** (e.g., `/// <reference types="next" />` in `next-env.d.ts` or essential ESLint ignore directives).
4. **Keep documentation synchronized** in `project_memory.md`, `design.md`, `changelogs.md`, and `README.md`.
