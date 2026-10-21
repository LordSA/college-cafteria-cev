# Project Memory — Cafteria Platform

> **Status:** Phase 4 (Cart, Order Management & Inventory Control) Complete  
> **Last Updated:** 2026-10-21  
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
├── supabase/migrations/      # Supabase CLI-compatible SQL migration files
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
* **Stack:** Next.js 14.2.35 (App Router), React 18, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`.
* **Target:** Cloudflare Pages (Static export via `output: 'export'`).
* **Dev Port:** `3000` (`http://localhost:3000`).
* **Environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Key Files:**
  - `src/app/layout.tsx`: Root HTML shell with `AuthProvider` and `CartProvider` wrappers.
  - `src/app/globals.css`: Base Tailwind directives and custom scrollbar resets.
  - `src/app/page.tsx`: Landing page showcasing platform value and ordering highlights.
  - `src/app/login/page.tsx`: Customer sign-in page with validation and forgot password link.
  - `src/app/signup/page.tsx`: Registration page with confirm password, terms checkbox, and OTP redirect.
  - `src/app/verify-email/page.tsx`: 6-digit OTP verification page with resend cooldown timer.
  - `src/app/forgot-password/page.tsx`: Email password recovery dispatch page.
  - `src/app/reset-password/page.tsx`: New password submission page.
  - `src/app/menu/page.tsx`: Public menu browsing page with search, category filters, ₹ pricing, quantity steppers, and floating bottom cart bar.
  - `src/app/cart/page.tsx`: Full shopping cart management page with line items, line totals, and clear cart control.
  - `src/app/checkout/page.tsx`: Order review page with live server availability verification, customer details, and unpaid placement CTA.
  - `src/app/orders/page.tsx`: Customer order record list with status badges and links to trackers.
  - `src/app/orders/track/page.tsx`: Dedicated live order tracking page with visual step timeline, breakdown, and self-cancellation button.
  - `src/app/profile/page.tsx`: Account profile with email confirmation status, staff approval state, and avatar upload/display.
  - `src/context/AuthContext.tsx`: Client authentication provider listening to Supabase session changes with profile refresh.
  - `src/context/CartContext.tsx`: Client-side persistent cart in `localStorage` (`cafteria_customer_cart`).
  - `src/lib/supabase.ts`: Singleton browser client for Supabase Auth.
  - `src/components/Header.tsx`: Navigation header with auth identity state, cart button with badge counter, orders link, and live API health indicator.
  - `src/components/Footer.tsx`: Minimal footer with status and campus copyright.
  - `src/components/ApiHealthBadge.tsx`: Client-side polling component testing connectivity to `/health`.

### 2.2 Admin Application (`admin/`)
* **Role:** Management, kitchen order dispatch queue (KDS), cashier operations, staff approvals, and menu catalog.
* **Stack:** Next.js 14.2.35 (App Router), React 18, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`.
* **Target:** Cloudflare Pages (Static export via `output: 'export'`).
* **Dev Port:** `3001` (`http://localhost:3001`).
* **Environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Key Files:**
  - `src/app/layout.tsx`: Root HTML shell for the back-office command center with `AdminAuthProvider`.
  - `src/app/globals.css`: Dark slate base styling.
  - `src/app/page.tsx`: Dual-state Operations Command Center providing an informative public landing view with "Sign In to Operations" CTA for unauthenticated visitors, and live metrics (dishes, in-stock count, categories, pending staff reviews, active orders, low stock items), identity badges, and subsystem action cards for verified administrators.
  - `src/app/orders/page.tsx`: Kitchen dispatch and live order management dashboard with status tab filters, search, and state transitions.
  - `src/app/inventory/page.tsx`: Pantry inventory management table with low-stock alerts, stock quantity editing, and 1-click 86 toggles.
  - `src/app/login/page.tsx`: Restricted admin sign-in with password recovery link.
  - `src/app/forgot-password/page.tsx`: Administrator password recovery request.
  - `src/app/reset-password/page.tsx`: Administrator password reset submission.
  - `src/app/staff-requests/page.tsx`: Operational review board for pending staff account approvals.
  - `src/app/categories/page.tsx`: Category management (list, add, active toggle).
  - `src/app/menu/page.tsx`: Menu item catalog management (list, add with presigned food image upload, toggle availability, archive).
  - `src/app/unauthorized/page.tsx`: Access denied screen for non-admin accounts.
  - `src/context/AdminAuthContext.tsx`: Admin session provider verifying role against `/api/v1/admin/me`.
  - `src/lib/supabase.ts`: Singleton browser client for Supabase Auth.
  - `src/components/Header.tsx`: Dark admin header with orders, inventory, menu, category, staff requests navigation, identity badge, and logout.
  - `src/components/Footer.tsx`: Admin-level audit footer.
  - `src/components/ApiHealthBadge.tsx`: Health check polling badge against Cloudflare Worker API.

### 2.3 Backend API (`backend/`)
* **Role:** Single source of truth for database operations, authentication, uploads, menu catalog, and business logic.
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
  - `src/lib/storage/`: Provider-independent storage service (`types.ts`, `supabaseProvider.ts`, `r2Provider.ts`, `index.ts`).
  - `src/routes/health.ts`: Unauthenticated `/health` check reporting uptime, worker version, and timestamp.
  - `src/routes/api.ts`: `/api/v1` router mounting all sub-routers.
  - `src/routes/auth.ts`: `GET /api/v1/auth/me` returning authenticated user profile.
  - `src/routes/admin.ts`: `GET /api/v1/admin/me` admin-only test endpoint returning verified admin identity.
  - `src/routes/staffRequests.ts`: Admin endpoints `GET /api/v1/admin/staff-requests`, `POST /:id/approve`, `POST /:id/reject`.
  - `src/routes/categories.ts`: Public `GET /api/v1/categories`, Admin `GET`, `POST`, `PATCH /api/v1/admin/categories`.
  - `src/routes/menu.ts`: Public `GET /api/v1/menu`, Admin `GET`, `POST`, `PATCH`, `DELETE /api/v1/admin/menu`.
  - `src/routes/uploads.ts`: Unified storage endpoints `POST /presign`, `POST /verify`, `GET /avatar`, `PUT /mock-sink`.
  - `src/routes/orders.ts`: Customer endpoints `POST /api/v1/orders`, `GET /api/v1/orders/me`, `GET /:id`, `POST /:id/cancel`.
  - `src/routes/adminOrders.ts`: Admin endpoints `GET /api/v1/admin/orders`, `GET /:id`, `PATCH /:id/status`.
  - `src/routes/adminInventory.ts`: Admin endpoints `GET /api/v1/admin/inventory`, `PATCH /:menuItemId`.
  - `src/types/env.ts`: TypeScript environment, profile, order, and inventory interfaces.
  - `tests/auth.test.ts`: 12 automated auth and RBAC test cases.
  - `tests/phase3.test.ts`: 12 automated menu, category, and staff approval test cases.
  - `tests/storage.test.ts`: 14 automated storage provider and upload security test cases.
  - `tests/phase4.test.ts`: 12 automated order creation, inventory deduction, idempotency, and status transition test cases.
  - `migrations/0001_create_profiles.sql`: Initial profile schema and RBAC triggers.
  - `migrations/0002_staff_approvals_and_menu.sql`: Categories, menu items, and staff approval state fields.
  - `migrations/0003_storage_buckets.sql`: Storage buckets and Storage RLS policies.
  - `migrations/0004_orders_and_inventory.sql`: Orders, order items, inventory movement logs, RLS, and transactional stored procedures (`place_order`, `cancel_order`, `update_inventory_stock`).

---

## 3. Communication & Decoupling Contracts

1. **No Next.js Server Routes:** Neither frontend is permitted to implement `/api/*` routes or server-side DB connections.
2. **Standard API Envelope:** All backend JSON responses follow standard schemas:
   - Success: `{ "success": true, "data": { ... }, "timestamp": "..." }`
   - Error: `{ "success": false, "error": { "code": "...", "message": "..." }, "timestamp": "..." }`
3. **Dynamic CORS:** Only origins listed in `ALLOWED_ORIGINS` (comma-separated, e.g. `http://localhost:3000,http://localhost:3001`) are granted `Access-Control-Allow-Origin`.
4. **Log Sanitization:** Sensitive headers (`Authorization`, `Cookie`, `X-Api-Key`, `X-Webhook-Signature`) are systematically replaced with `[REDACTED]` before printing.
5. **Zero-Trust Role Enforcement:** Roles and classifications are resolved exclusively from the verified database record; browser metadata is ignored.

---

## 4. Phase Implementation Tracker

| Phase | Title | Status | Scope |
|---|---|---|---|
| **Phase 1** | Project Foundation | **Completed** | Decoupled client scaffolding, static exports, Hono Worker API, CORS, logging, health probes. |
| **Phase 2** | Authentication & RBAC | **Completed** | Supabase Auth, `public.profiles` schema, RLS policies, Hono `requireAuth` & `requireAdmin`, customer login/signup/profile, admin login/unauthorized/dashboard. |
| **Phase 3** | Menu Engine, Staff Approval & Storage | **Completed** | Categories, menu items, integer paise pricing, availability toggles, staff approval review board, OTP email verification, password recovery, temporary Supabase Storage provider with preserved R2 support. |
| **Phase 4** | Order Lifecycle & KDS | Planned | State machine order pipeline, token generation, kitchen live ticket board. |
| **Phase 5** | Production Media Migration | Planned | Re-evaluating Cloudflare R2 activation once account issues are resolved. |
| **Phase 6** | Payments & Settlement | Planned | Razorpay checkout, webhook signature validation, daily financial reconciliation. |

---

## 5. Strict Zero-Comment Mandate in Source Code

Whenever modifying source files in this repository:
1. **Never leave developer or agent commentary** (`// explanation`, `/* block */`, `{/* JSX */}`).
2. **Delete file headers** like `// src/app/page.tsx`.
3. **Only preserve tool-required comments** (e.g., `/// <reference types="next" />` in `next-env.d.ts` or essential ESLint ignore directives).
4. **Keep documentation synchronized** in `project_memory.md`, `design.md`, `changelogs.md`, and `README.md`.
