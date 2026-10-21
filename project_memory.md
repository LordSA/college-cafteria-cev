# Project Memory — Cafteria Platform

> **Status:** Phase 4.1 (Testing Wallet, QR Order Verification & Bill Printing) Complete  
> **Last Updated:** 2026-10-22  
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
* **Stack:** Next.js 14.2.35 (App Router), React 18, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`, `qrcode`.
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
  - `src/app/checkout/page.tsx`: Order review page with testing wallet balance check, payment method selector ("Testing Wallet — Demo Credits" vs "Pay at Counter"), and atomic order placement.
  - `src/app/checkout/success/page.tsx`: Order confirmation screen displaying pickup token, high-contrast SVG QR pass for counter verification, and receipt printing action.
  - `src/app/wallet/page.tsx`: Testing wallet dashboard showing demo credits balance, non-monetary notice, and auditable transaction ledger.
  - `src/app/orders/page.tsx`: Customer order record list with status badges and links to trackers.
  - `src/app/orders/track/page.tsx`: Dedicated live order tracking page with visual step timeline, counter pickup QR pass, breakdown, and self-cancellation button.
  - `src/app/orders/receipt/page.tsx`: Print-friendly (`@media print`) bill layout with Cafteria branding, itemization, and verification QR code.
  - `src/app/profile/page.tsx`: Account profile with email confirmation status, staff approval state, and avatar upload/display.
  - `src/context/AuthContext.tsx`: Client authentication provider listening to Supabase session changes with profile refresh.
  - `src/context/CartContext.tsx`: Client-side persistent cart in `localStorage` (`cafteria_customer_cart`).
  - `src/lib/supabase.ts`: Singleton browser client for Supabase Auth.
  - `src/components/QRCodeSvg.tsx`: Zero-dependency SVG QR code generator component.
  - `src/components/Header.tsx`: Navigation header with auth identity state, cart button with badge counter, wallet balance indicator, orders link, and live API health indicator.
  - `src/components/Footer.tsx`: Minimal footer with status and campus copyright.
  - `src/components/ApiHealthBadge.tsx`: Client-side polling component testing connectivity to `/health`.

### 2.2 Admin Application (`admin/`)
* **Role:** Management, kitchen order dispatch queue (KDS), cashier operations, testing wallet controls, QR scanner, staff approvals, and menu catalog.
* **Stack:** Next.js 14.2.35 (App Router), React 18, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`, `qrcode`.
* **Target:** Cloudflare Pages (Static export via `output: 'export'`).
* **Dev Port:** `3001` (`http://localhost:3001`).
* **Environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Key Files:**
  - `src/app/layout.tsx`: Root HTML shell for the back-office command center with `AdminAuthProvider`.
  - `src/app/globals.css`: Dark slate base styling.
  - `src/app/page.tsx`: Operations Command Center with metrics (orders, in-stock count, categories, staff reviews), subsystem quick actions (Orders, QR Scanner, Testing Wallets, Inventory, Menu, Categories, Staff Requests).
  - `src/app/orders/page.tsx`: Kitchen dispatch and live order management dashboard with status tab filters, search, payment method badges, collected timestamps, and receipt buttons.
  - `src/app/orders/receipt/page.tsx`: High-contrast, cashier printable register bill layout (`@media print`).
  - `src/app/scan/page.tsx`: Camera scanner with manual token fallback, order verification card with item checklist, and 1-click "Confirm Order Collection" action.
  - `src/app/wallets/page.tsx`: Customer testing wallet management, search, balance adjustment modal (credit/debit with mandatory audit reason), and customer ledger dialog.
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
  - `src/components/QRCodeSvg.tsx`: Zero-dependency SVG QR code generator component.
  - `src/components/Header.tsx`: Dark admin header with orders, scanner, wallets, inventory, menu, category, staff requests navigation, identity badge, and logout.
  - `src/components/Footer.tsx`: Admin-level audit footer.
  - `src/components/ApiHealthBadge.tsx`: Health check polling badge against Cloudflare Worker API.

### 2.3 Backend API (`backend/`)
* **Role:** Single source of truth for database operations, authentication, testing wallets, QR verification, uploads, menu catalog, and business logic.
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
  - `src/routes/api.ts`: `/api/v1` router mounting all sub-routers (v1.4.1).
  - `src/routes/auth.ts`: `GET /api/v1/auth/me` returning authenticated user profile.
  - `src/routes/admin.ts`: `GET /api/v1/admin/me` admin-only test endpoint returning verified admin identity.
  - `src/routes/staffRequests.ts`: Admin endpoints `GET /api/v1/admin/staff-requests`, `POST /:id/approve`, `POST /:id/reject`.
  - `src/routes/categories.ts`: Public `GET /api/v1/categories`, Admin `GET`, `POST`, `PATCH /api/v1/admin/categories`.
  - `src/routes/menu.ts`: Public `GET /api/v1/menu`, Admin `GET`, `POST`, `PATCH`, `DELETE /api/v1/admin/menu`.
  - `src/routes/uploads.ts`: Unified storage endpoints `POST /presign`, `POST /verify`, `GET /avatar`, `PUT /mock-sink`.
  - `src/routes/orders.ts`: Customer endpoints `POST /api/v1/orders` (supports `testing_wallet`), `GET /api/v1/orders/me`, `GET /:id`, `POST /:id/cancel`, `GET /:id/receipt`.
  - `src/routes/adminOrders.ts`: Admin endpoints `GET /api/v1/admin/orders`, `GET /:id`, `PATCH /:id/status`, `POST /verify-qr`, `POST /:id/collect`, `GET /:id/receipt`.
  - `src/routes/adminInventory.ts`: Admin endpoints `GET /api/v1/admin/inventory`, `PATCH /:menuItemId`.
  - `src/routes/wallet.ts`: Customer endpoints `GET /api/v1/wallet/me`, `GET /api/v1/wallet/transactions`.
  - `src/routes/adminWallet.ts`: Admin endpoints `GET /api/v1/admin/wallets`, `GET /:customerId`, `POST /:customerId/adjust`.
  - `src/types/env.ts`: TypeScript environment, profile, order, inventory, and wallet interfaces.
  - `tests/auth.test.ts`: 12 automated auth and RBAC test cases.
  - `tests/phase3.test.ts`: 12 automated menu, category, and staff approval test cases.
  - `tests/storage.test.ts`: 14 automated storage provider and upload security test cases.
  - `tests/phase4.test.ts`: 12 automated order creation, inventory deduction, idempotency, and status transition test cases.
  - `tests/phase4_1.test.ts`: 13 automated wallet credit/debit, negative balance prevention, QR verification, collection, and receipt test cases.
  - `migrations/0001_create_profiles.sql`: Initial profile schema and RBAC triggers.
  - `migrations/0002_staff_approvals_and_menu.sql`: Categories, menu items, and staff approval state fields.
  - `migrations/0003_storage_buckets.sql`: Storage buckets and Storage RLS policies.
  - `migrations/0004_orders_and_inventory.sql`: Orders, order items, inventory movement logs, RLS, and transactional stored procedures.
  - `migrations/0005_wallet_and_qr_verification.sql`: Wallets, ledger transactions, orders QR verification fields, and PL/pgSQL stored procedures (`adjust_wallet_balance`, `pay_order_with_wallet`, `verify_qr_token`, `collect_order`).
  - `migrations/0006_foreign_keys_profiles.sql`: Explicit foreign key relationships between `orders`, `wallets`, `wallet_transactions` and `public.profiles(id)` enabling PostgREST schema cache detection and decoupled batch profile lookups.

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
| **Phase 4** | Order Lifecycle & Inventory Control | **Completed** | Shopping cart, checkout validation, atomic inventory decrement and restock on cancel, order number generation, kitchen order display queue. |
| **Phase 4.1** | Testing Wallet, QR Order Verification & Bill Printing | **Completed** | Demo credit testing wallet with auditable ledger, non-negative balance enforcement, instant wallet checkout, QR verification pass, admin scanner, atomic order collection, and printable receipts. |
| **Phase 5** | Production Media Migration & Payment Gateways | Planned | Cloudflare R2 bucket activation, Razorpay checkout gateway, webhook verification. |
| **Phase 6** | Analytics & Sales Reporting | Planned | Financial auditing, peak rush traffic heatmaps, settlement reconciliation. |

---

## 5. Strict Zero-Comment Mandate in Source Code

Whenever modifying source files in this repository:
1. **Never leave developer or agent commentary** (`// explanation`, `/* block */`, `{/* JSX */}`).
2. **Delete file headers** like `// src/app/page.tsx`.
3. **Only preserve tool-required comments** (e.g., `/// <reference types="next" />` in `next-env.d.ts` or essential ESLint ignore directives).
4. **Keep documentation synchronized** in `project_memory.md`, `design.md`, `changelogs.md`, and `README.md`.
