# Project Memory — Cafteria Platform

> **Status:** Phase 5 (Production Razorpay Payments, 4-Tier Roles, Strict Order Lifecycle & Excel Reports) Complete  
> **Last Updated:** 2026-11-08  
> **Rule Requirement:** Developers and automated agents **MUST** read this document before making any changes and update it whenever files, schemas, endpoints, or conventions change.

---

## 1. System Overview

Cafteria is a full-stack digital canteen ordering and management platform purpose-built for college campuses. It enables students and faculty to browse daily menu items, order meals ahead, pay digitally via Razorpay Standard Checkout or Faculty Pay Later, and pick up without physical queueing, while providing canteen staff with real-time kitchen operations, inventory controls, and auditable Excel reporting.

### Architectural Structure
The repository contains **three completely decoupled, independent applications** without monorepo workspace baggage:

```
college-canteen-cev/
├── customer/                 # Port 3000: Next.js 16 App Router (Customer Ordering Web App)
├── admin/                    # Port 3001: Next.js 16 App Router (Staff & Kitchen Management)
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
* **Stack:** Next.js 16.4.3 (App Router), React 19, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`, `qrcode`.
* **Target:** Cloudflare Pages (Static export via `output: 'export'`).
* **Dev Port:** `3000` (`http://localhost:3000`).
* **Environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
* **Key Files:**
  - `src/app/layout.tsx`: Root HTML shell with `AuthProvider` and `CartProvider` wrappers.
  - `src/app/globals.css`: Base Tailwind directives and custom scrollbar resets.
  - `src/app/page.tsx`: Unified campus dining portal featuring warm coral/orange gradient theme across mobile and desktop PC, search pill, circular categories, "Hot Products" (most ordered items), exclusive deals, live kitchen products, and rich footer. Hamburger button removed on mobile for streamlined UI.
  - `src/app/privacy/page.tsx`: Privacy Policy page detailing campus data handling, profile safety, payment processing, and RLS data security.
  - `src/app/terms/page.tsx`: Terms & Conditions page specifying college canteen operating rules, Counter #1 collection, payment policies, and collection verification.
  - `src/app/payment-faq/page.tsx`: Payment FAQs page with interactive accordion covering Razorpay payments, Counter #1 pickups, faculty pay later, and QR pass security.
  - `src/components/MobileBottomNav.tsx`: Persistent mobile dock navigation (`md:hidden`) with 4 destinations (`Home`, `Menu`, `Cart`, `Profile`), active coral rounded highlight, and live cart count badge. `Orders` tab removed.
  - `src/components/SidebarDrawer.tsx`: Slide-over drawer with user profile, quick navigation links, dining hours, and auth actions.
  - `src/components/Navbar.tsx`: Desktop PC navigation header (`hidden md:block`) with clean `Home`, `Menu` links, wallet icon, cart button with item count badge, and user profile avatar / Login button. (Re-exported via `Header.tsx` as `Header`).
  - `src/components/Header.tsx`: Re-exports `Navbar as Header` for backward compatibility.
  - `src/components/Footer.tsx`: Modern campus canteen footer hidden on mobile devices (`hidden md:block`).
  - `src/app/login/page.tsx`: Sign-in page with email/password and "Continue with Google" OAuth button.
  - `src/app/signup/page.tsx`: Registration page with student vs faculty selection, conditional Teacher ID capture (3-20 characters), confirm password, terms checkbox, and "Continue with Google" button.
  - `src/app/verify-email/page.tsx`: 6-digit OTP verification page with resend cooldown timer.
  - `src/app/forgot-password/page.tsx`: Email password recovery dispatch page.
  - `src/app/reset-password/page.tsx`: New password submission page.
  - `src/app/settings/page.tsx`: Dedicated Account Settings page featuring Back button, Account Security (Change Password, Google Account Link/Unlink, Sign Out), and Account Information (Email, Role, Teacher ID input with verification status).
  - `src/app/profile/page.tsx`: Account profile with role displayed under name, Instagram-style circular profile avatar with camera overlay badge and direct file upload preview modal, phone number input, Pay Later dues settlement, gear icon link to `/settings`, and prominent bottom red Sign Out button.
  - `src/app/menu/page.tsx`: Vertical column layout menu page with category filter modal, live ₹ pricing, stock display, item quantity steppers, 5-minute reservation timer banner, and floating bottom cart bar.
  - `src/app/cart/page.tsx`: Shopping cart management page with line items, line totals, 5-minute lock countdown, clear cart control, and "My Orders" access buttons in the header, empty state, and summary sidebar.
  - `src/app/checkout/page.tsx`: Order checkout page integrating Razorpay Standard Checkout in integer paise (INR), signature verification API call, fallback for testing wallet (in test mode), and Faculty Pay Later.
  - `src/app/checkout/success/page.tsx`: Order confirmation screen displaying pickup token, high-contrast SVG QR pass for counter verification on top, and itemized ordered dishes directly below.
  - `src/app/wallet/page.tsx`: Testing wallet dashboard showing demo credits balance and auditable transaction ledger.
  - `src/app/orders/page.tsx`: Customer order record list with status badges and links to trackers.
  - `src/app/orders/track/page.tsx`: Live order tracking page with counter pickup QR pass on top, ordered dishes directly below, and 3-stage progress indicator. Customer cancellation buttons and modal dialogs completely removed.
  - `src/app/orders/receipt/page.tsx`: Print-friendly (`@media print`) bill layout with Cafteria branding, itemization, and verification QR code.
  - `src/app/not-found.tsx`: Clean 404 error page.
  - `src/context/AuthContext.tsx`: Client authentication provider listening to Supabase session changes, Google OAuth sign-in, profile phone and avatar key update, and Teacher ID capture.
  - `src/context/CartContext.tsx`: Client-side persistent cart with atomic server locking (`/api/v1/cart/lock`, `/unlock`, `/release-all`), 5-minute auto-expiry countdown, and automatic stock restoration.
  - `src/lib/supabase.ts`: Singleton browser client for Supabase Auth.
  - `src/components/QRCodeSvg.tsx`: Zero-dependency SVG QR code generator component.
  - `src/components/ApiHealthBadge.tsx`: Client-side polling component testing connectivity to `/health`.

### 2.2 Admin Application (`admin/`)
* **Role:** Operations management, kitchen dispatch (KDS), cashier operations, testing wallet controls, QR scanner, staff approvals, catalog, and developer console.
* **Stack:** Next.js 16.4.3 (App Router), React 19, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`, `qrcode`.
* **Theme:** Neo-Dark Obsidian & Pastel Rose/Purple (`#101114` canvas, `#17181f` surfaces, `#22242e` borders, `#f5a4c6` pink active pills, `#9d8bf0` purple secondary accents, `#ea9955` amber indicators).
* **Target:** Cloudflare Pages (Static export via `output: 'export'`).
* **Dev Port:** `3001` (`http://localhost:3001`).
* **Environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Key Files:**
  - `src/app/layout.tsx`: Root HTML shell with `AdminAuthProvider` and neo-dark background.
  - `src/app/globals.css`: Dark obsidian base styling (`#101114`).
  - `src/app/page.tsx`: Operations Command Center with icon navigation rail, rose active pill, search header, quick-action cards, velocity chart, real financial overview metrics from `GET /api/v1/admin/reports/stats`, and dynamic Excel Export (`.xlsx`) button downloading from `GET /api/v1/admin/reports/export`.
  - `src/app/developer/page.tsx`: Developer Console with system diagnostics (payment mode, webhook health, runtime) and user role management table (`GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/role`).
  - `src/app/orders/page.tsx`: Kitchen dispatch and live order management dashboard with status tab pills, search pill, stage badges (`ORDER_PLACED`, `READY_TO_PICK`, `COLLECTED`), Pay Later payment indicators, items checklist drawer, and receipt print buttons.
  - `src/app/orders/receipt/page.tsx`: Cashier printable register bill layout (`@media print`).
  - `src/app/scan/page.tsx`: Camera scanner viewport with manual token fallback, order verification card with item checklist, and "Confirm Order Collection" action.
  - `src/app/wallets/page.tsx`: Customer testing wallet management, search pill, balance adjustment modal, and customer ledger dialog in neo-dark design.
  - `src/app/inventory/page.tsx`: Pantry inventory management table with neon low-stock alerts, stock quantity editing drawer, and 1-click toggles.
  - `src/app/login/page.tsx`: Restricted admin sign-in with neo-dark container card.
  - `src/app/forgot-password/page.tsx`: Administrator password recovery request card.
  - `src/app/reset-password/page.tsx`: Administrator password reset submission card.
  - `src/app/staff-requests/page.tsx`: Operational review board for pending staff account approvals displaying applicant Teacher ID badge alongside email and registration date.
  - `src/app/categories/page.tsx`: Category management (list, add card, active toggle).
  - `src/app/menu/page.tsx`: Menu item catalog management.
  - `src/app/unauthorized/page.tsx`: Access denied screen for non-admin accounts.
  - `src/app/not-found.tsx`: Clean 404 administration error page.
  - `src/context/AdminAuthContext.tsx`: Admin session provider verifying 4-tier roles (`developer`, `admin`, `retail`, `staff`) with permission flags (`isDeveloper`, `isAdmin`, `isRetail`, `isStaff`, `canManageUsers`, `canManageInventory`, `canManageOrders`, `canScanQr`, `canViewReports`).
  - `src/lib/supabase.ts`: Singleton browser client for Supabase Auth.
  - `src/components/Header.tsx`: Neo-dark admin header with logo, role badges (`DEVELOPER`, `ADMIN`, `RETAIL`, `STAFF`), role-filtered navigation tabs, user avatar, and logout.
  - `src/components/Footer.tsx`: Neo-dark audit footer.
  - `src/components/ApiHealthBadge.tsx`: Pill badge monitoring `/health` status.

### 2.3 Backend API (`backend/`)
* **Role:** Single source of truth for database operations, authentication, payments, QR verification, uploads, menu catalog, reporting, and business logic.
* **Stack:** Hono framework, TypeScript (Strict), Cloudflare Workers, Wrangler (`^4.158.0`), `@cloudflare/workers-types` (`^5.20261107.1`), Zod, Vitest, `xlsx`.
* **Target:** Cloudflare Workers (Global Edge Network).
* **Dev Port:** `8787` (`http://localhost:8787`).
* **Key Files:**
  - `src/index.ts`: Primary Hono router, global middleware binding, route mounting, and 404/error handler.
  - `src/middleware/auth.ts`: Reusable `requireAuth` (Bearer token verification), `requireRole(allowedRoles)`, `requireAdmin`, and `requireDeveloper` middlewares with context caching.
  - `src/middleware/cors.ts`: Dynamic CORS origin matching against `ALLOWED_ORIGINS` binding.
  - `src/middleware/logger.ts`: Sanitized JSON request logger redacting authorization headers and sensitive query parameters.
  - `src/middleware/error.ts`: Centralized error handling returning structured JSON envelopes.
  - `src/lib/razorpay.ts`: Standard Razorpay payment gateway client, order generation, checkout signature verification, and webhook signature verification using Web Crypto HMAC SHA-256 and constant-time comparison.
  - `src/lib/supabase.ts`: Token verification and database profile retrieval via Supabase Admin/User clients.
  - `src/lib/storage/`: Provider-independent storage service (`types.ts`, `supabaseProvider.ts`, `r2Provider.ts`, `index.ts`).
  - `src/routes/health.ts`: Unauthenticated `/health` check reporting uptime, worker version, and timestamp.
  - `src/routes/api.ts`: `/api/v1` router mounting all sub-routers.
  - `src/routes/auth.ts`: `GET /api/v1/auth/me` and `PATCH /api/v1/auth/me/profile` for updating display name, avatar key, and Teacher ID.
  - `src/routes/admin.ts`: `GET /api/v1/admin/me`, `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/role`, and `GET /api/v1/admin/diagnostics`.
  - `src/routes/reports.ts`: Financial metrics `GET /api/v1/admin/reports/stats`, fund flow `GET /api/v1/admin/reports/funds`, and 5-sheet Excel workbook export `GET /api/v1/admin/reports/export` in `Asia/Kolkata` timezone.
  - `src/routes/webhooks.ts`: Razorpay webhook listener `POST /api/v1/webhooks/razorpay` with raw payload HMAC SHA-256 signature verification and event deduplication via `payment_webhook_events`.
  - `src/routes/staffRequests.ts`: Admin endpoints `GET /api/v1/admin/staff-requests`, `POST /:id/approve`, `POST /:id/reject` with Teacher ID and email support.
  - `src/routes/categories.ts`: Public `GET /api/v1/categories`, Admin `GET`, `POST`, `PATCH /api/v1/admin/categories`.
  - `src/routes/menu.ts`: Public `GET /api/v1/menu`, Admin `GET`, `POST`, `PATCH`, `DELETE /api/v1/admin/menu`.
  - `src/routes/uploads.ts`: Unified storage endpoints `POST /presign`, `POST /verify`, `GET /avatar`, `PUT /mock-sink`.
  - `src/routes/cart.ts`: Cart item locking endpoints `POST /api/v1/cart/lock`, `POST /api/v1/cart/unlock`, `POST /api/v1/cart/release-all`, `GET /api/v1/cart/status`.
  - `src/routes/orders.ts`: Customer endpoints `POST /api/v1/orders` (supports `razorpay`, `testing_wallet`, `counter_cash`, and faculty `pay_later`), `POST /api/v1/orders/verify-payment`, `GET /api/v1/orders/me` (returns `order_stage`), `GET /api/v1/orders/pay-later/pending`, `POST /api/v1/orders/pay-later/settle`, `GET /:id`, `GET /:id/receipt`. Customer cancellation endpoint permanently removed.
  - `src/routes/adminOrders.ts`: Admin endpoints `GET /api/v1/admin/orders` (role-checked), `GET /:id`, `POST /:id/ready` (`ORDER_PLACED` -> `READY_TO_PICK`), `PATCH /:id/status`, `POST /verify-qr` (accessible to `staff`), `POST /collect-qr` (direct collection by QR token, accessible to `staff`), `POST /:id/collect` (accessible to `staff`), `GET /:id/receipt`.
  - `src/routes/adminInventory.ts`: Admin endpoints `GET /api/v1/admin/inventory`, `PATCH /:menuItemId` and `PUT /:menuItemId` (protected with `requireRole(['developer', 'admin', 'retail'])`).
  - `src/routes/wallet.ts`: Customer endpoints `GET /api/v1/wallet/me`, `GET /api/v1/wallet/transactions`.
  - `src/routes/adminWallet.ts`: Admin endpoints `GET /api/v1/admin/wallets`, `GET /:customerId`, `POST /:customerId/adjust`.
  - `src/types/env.ts`: AppRole enum (`developer`, `admin`, `retail`, `staff`, `customer`), Payment interface, PaymentWebhookEvent interface, Teacher ID field.
  - `supabase/migrations/20261107000001_phase_5_security_and_roles.sql`: Phase 5 schema updates adding `teacher_id`, `payments` table, `payment_webhook_events` table, `app_role` check constraint, and `set_user_role` stored procedure.

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
| **Phase 5** | Production Payment Integration, 4-Tier Roles & Excel Reports | **Completed** | Razorpay Standard Checkout in integer paise, Webhook HMAC SHA-256 deduplication, 4-tier roles (developer/admin/retail/staff), developer console, strict 3-stage order lifecycle, customer settings, circular avatar upload, and multi-sheet Excel reporting. |
| **Phase 6** | Advanced Analytics & Predictive Inventory | Planned | Rush hour predictive modeling, demand forecasting, automated re-ordering triggers. |

---

## 5. Strict Zero-Comment Mandate in Source Code

Whenever modifying source files in this repository:
1. **Never leave developer or agent commentary** (`// explanation`, `/* block */`, `{/* JSX */}`).
2. **Delete file headers** like `// src/app/page.tsx`.
3. **Only preserve tool-required comments** (e.g., `/// <reference types="next" />` in `next-env.d.ts` or essential ESLint ignore directives).
4. **Keep documentation synchronized** in `project_memory.md`, `design.md`, `changelogs.md`, and `README.md`.
