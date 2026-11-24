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
* **Stack:** Next.js 16.4.6 (App Router), React 19, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`, `qrcode`.
* **Target:** Cloudflare Pages (Static export via `output: 'export'`).
* **Dev Port:** `3000` (`http://localhost:3000`).
* **Environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. (Razorpay key is delivered dynamically by backend API responses).
* **Key Files:**
  - `src/app/layout.tsx`: Root HTML shell with `ThemeProvider`, `AuthProvider`, and `CartProvider` wrappers.
  - `src/context/ThemeContext.tsx`: Client-side theme provider supporting 3 modes (`device` | `dark` | `light`), live OS media query tracking (`prefers-color-scheme: dark`), and local storage persistence.
  - `src/app/globals.css`: Base Tailwind directives, `.dark` color variables, glassmorphic surfaces (`.glass-surface`), safe-area positioning (`.safe-area-bottom`), responsive elevated cart bar positioning (`.floating-cart-bottom`), and custom scrollbar resets.
  - `src/components/WelcomeLanding.tsx`: Welcome splash screen for unauthenticated users featuring hero visual, "Welcome to Cafeteria CEV", "Start with email", Google OAuth button, and "Sign In" link.
  - `src/app/page.tsx`: Unified campus dining portal featuring auth gate displaying `WelcomeLanding` to guests, warm coral/orange gradient theme with dark mode glassmorphic styling, mobile category filter modal (`SlidersHorizontal` trigger with active filter indicator), clearable search bar with `X` button, real-time dedicated Search Results list view (bypassing static rails and displaying matching item count, dish details, and add-to-cart steppers in a clean list), interactive category rail, "Hot Products", elevated floating bottom cart checkout bar (`.floating-cart-bottom` preventing `MobileBottomNav` overlap), and generous scroll padding (`pb-44`).
  - `src/app/layout.tsx`: Root HTML shell with `ThemeProvider`, `AuthProvider`, and `CartProvider` wrappers, configured with OpenGraph and Twitter card metadata using `banner.png` for link sharing across WhatsApp, Telegram, and social platforms.
  - `src/app/privacy/page.tsx`: Privacy Policy page detailing campus data handling, profile safety, payment processing, and RLS data security.
  - `src/app/terms/page.tsx`: Terms & Conditions page specifying college canteen operating rules, Counter #1 collection, payment policies, and strict No-Refund & No-Cancellation policy.
  - `src/app/payment-faq/page.tsx`: Payment FAQs page with interactive accordion covering Razorpay payments, Counter #1 pickups, strict No-Refund policy, faculty pay later, and QR pass security. Pay at Counter removed.
  - `src/components/MobileBottomNav.tsx`: Persistent curved floating dock navigation (`md:hidden`, `rounded-[28px]`, `backdrop-blur-xl`) with 4 destinations (`Home`, `Menu`, `Cart`, `Profile`), active orange highlight, and live cart count badge. Hidden on auth pages and for unauthenticated guests.
  - `src/components/SidebarDrawer.tsx`: Slide-over drawer with user profile, dynamic theme icon (`cafe ico 1.png` / `cafe ico 2.png`), quick navigation links, dining hours, and auth actions.
  - `src/components/Navbar.tsx`: Desktop PC navigation header (`hidden md:block`) with `logo title.svg`, dynamic theme icon, clean `Home`, `Menu` links, cart button with item count badge, and user profile avatar / Login button. (Re-exported via `Header.tsx` as `Header`).
  - `src/components/Header.tsx`: Re-exports `Navbar as Header` for backward compatibility.
  - `src/components/Footer.tsx`: Modern campus canteen footer with `logo title.svg`, dark mode glassmorphic styling, and No-Refund policy statement.
  - `src/app/login/page.tsx`: Redesigned minimalist sign-in page with email, password with show/hide eye toggle, orange pill button, and "Continue with Google" OAuth.
  - `src/app/signup/page.tsx`: Minimalist registration page creating default Student accounts. (Teacher management is handled directly by administrators in the Admin portal).
  - `src/app/verify-email/page.tsx`: 6-digit OTP verification page with resend cooldown timer and automatic redirection to home (`/`).
  - `src/app/forgot-password/page.tsx`: Email password recovery dispatch page.
  - `src/app/reset-password/page.tsx`: New password submission page.
  - `src/app/settings/page.tsx`: Dedicated Account Settings page featuring Appearance & Theme 3-way toggle (`Device`, `Dark`, `Light`), Account Security (Change Password modal popup card, Google Account Link/Unlink, Sign Out), and Account Information with campus classification badges.
  - `src/app/orders/page.tsx`: My Orders list displaying today's orders by default, with an expandable section to review past historical orders.
  - `src/context/CartContext.tsx`: Manages shopping cart state, real-time portions validation against inventory, 4-second reservation expiration timer (`EXPIRED_NOTICE_DURATION_MS = 4000`), and local storage sync.
  - `src/app/profile/page.tsx`: Account profile with role and classification displayed under name (Student, Teacher / Faculty `staff_t`, Guest Diner `guest`), circular profile avatar with camera overlay badge opening interactive preset SVG avatar selection modal, phone number input, Pay Later custom dues settlement via Razorpay modal with flexible custom amount input and live debt deduction, gear icon link to `/settings`, and prominent bottom red Sign Out button.
  - `src/app/menu/page.tsx`: Menu page featuring curved gradient header (`rounded-b-[2.5rem]` mobile, `rounded-3xl` desktop), real-time live search bar, category filter modal, live ₹ pricing, stock display, item quantity steppers, 5-minute reservation timer banner, generous bottom scroll padding (`pb-44`), and elevated floating bottom cart bar (`.floating-cart-bottom` maintaining 16px clearance above `MobileBottomNav`). Expiry notification banners removed from menu page. Auth-gated with automatic redirect to `/login`.
  - `src/app/cart/page.tsx`: Shopping cart management page featuring curved gradient header, line items, line totals, 5-minute lock countdown with automatic expired item eviction, 1-minute auto-dismissing reservation expiry notice, clear cart control, and "My Orders" access buttons. Auth-gated with automatic redirect to `/login`.
  - `src/app/orders/page.tsx`: Orders management page showing active preparation queues and receipts. Auth-gated with automatic redirect to `/login`.
  - `src/app/orders/track/page.tsx`: Live order tracking page with counter pickup QR pass, ordered dishes list, 2-stage progress indicator (`1. Order Placed` -> `2. Collected`), and automatic 10:00 PM IST daily cutoff detection rendering an expired collection pass card.
  - `src/app/orders/receipt/page.tsx`: Printable customer receipt with order token, QR verification token, 10:00 PM IST cutoff expiration detection, and strict No-Refund policy disclosure.
  - `src/app/wallet/page.tsx`: Legacy route redirected automatically to `/`.
  - `src/app/checkout/page.tsx`: Takeaway checkout page featuring real-time menu availability validation (`?t=${Date.now()}` with `{ cache: 'no-store' }`), Razorpay Standard Checkout modal integration, order ID resolution (`data.data.id || data.data.order_id`), server payment verification dispatch (`POST /api/v1/orders/verify-payment`), faculty pay later submission strictly reserved for approved `staff_t` accounts, and strict No-Refund policy disclosure. Pay at Counter (`counter_cash`) option completely removed.
  - `src/app/checkout/success/page.tsx`: Order confirmation screen featuring the mechanical `ReceiptPrinterAnimation` thermal takeaway ticket, live pickup token, and quick action buttons. Supports both `order_id` and `id` query parameters (`searchParams.get('order_id') || searchParams.get('id')`).
  - `src/app/wallet/page.tsx`: Testing wallet dashboard showing demo credits balance and auditable transaction ledger.
  - `src/app/orders/page.tsx`: Customer order record list featuring curved gradient header, 2-stage status badges (`ORDER_PLACED`, `COLLECTED`), and links to trackers. Order cancellation completely removed.
  - `src/app/orders/track/page.tsx`: Live order tracking page with counter pickup QR pass, ordered dishes list, and 2-stage progress indicator (`1. Order Placed` -> `2. Collected`).
  - `src/app/orders/receipt/page.tsx`: Print-friendly (`@media print`) bill layout with Cafteria branding, itemization, and verification QR code.
  - `src/app/not-found.tsx`: Clean 404 error page.
  - `src/context/AuthContext.tsx`: Client authentication provider listening to Supabase session changes, Google OAuth sign-in, profile phone and avatar key update, and Teacher ID capture.
  - `src/context/CartContext.tsx`: Client-side persistent cart with atomic server locking (`/api/v1/cart/lock`, `/unlock`, `/release-all`), per-item `expires_at` tracking, second-by-second auto-expiration, 1-minute auto-dismissing expiry notice window (`cafteria_cart_expired_at`), and automatic stock restoration.
  - `src/lib/razorpay.ts`: Reusable dynamic script loader for Razorpay Checkout (`loadRazorpayScript()`).
  - `src/lib/orderExpiry.ts`: Order QR code expiration utility determining if current time exceeds 10:00 PM IST (UTC+05:30) on the order creation date.
  - `src/lib/supabase.ts`: Singleton browser client for Supabase Auth.
  - `src/components/ReceiptPrinterAnimation.tsx`: Mechanical thermal receipt printer component with stepped feed CSS keyframes, dark machine housing, digital screen status, serrated tooth clip-path edge, embedded SVG QR code, and dynamic payment method badges (PAID ONLINE or FACULTY CREDIT).
  - `src/components/QRCodeSvg.tsx`: Zero-dependency SVG QR code generator component.
  - `src/components/ApiHealthBadge.tsx`: Client-side polling component testing connectivity to `/health`.

### 2.2 Admin Application (`admin/`)
* **Role:** Operations management, kitchen dispatch (KDS), cashier operations, testing wallet controls, QR scanner, staff approvals, catalog, and developer console.
* **Stack:** Next.js 16.4.6 (App Router), React 19, TypeScript (Strict), Tailwind CSS, Lucide React, `@supabase/supabase-js`, `qrcode`.
* **Theme:** Campus Canteen Minimalist & Warm Culinary Orange (`#F47721` primary, `#E06310` hover, `#FFF7F0` soft peach surface, `#FFFFFF` pure-white canvas, `#252525` high-contrast text, `#EEEEEE` borders, `#269B62` success, `#D94A43` error, `#F59E0B` warning). 100% theme parity with customer portal, featuring organic wave footer with IEDC CEV attribution.
* **Target:** Cloudflare Pages (Static export via `output: 'export'`).
* **Dev Port:** `3001` (`http://localhost:3001`).
* **Environment:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* **Key Files:**
  - `src/app/layout.tsx`: Root HTML shell with `AdminAuthProvider` and clean white background.
  - `src/app/globals.css`: Brand theme variables, Inter typography, `.btn-glazed-orange`, `.focus-ring`, and safe area spacing.
  - `src/components/AdminSidebar.tsx`: Pure white responsive navigation rail on desktop (`hidden md:flex md:w-20`) with Cafeteria.cev branding, brand logo, role-gated icon navigation, and active `#F47721` orange pill highlight on `#FFF7F0`. Filtered dynamically according to 5 operational roles (`developer`, `admin`, `staff`, `retail`, `printer`).
  - `src/components/Header.tsx`: Content area top header featuring Cafeteria.cev identity, role badges (`DEVELOPER`, `ADMIN`, `RETAIL`, `STAFF`, `PRINTER`), user profile avatar, and sign out control.
  - `src/components/Footer.tsx`: Organic curved wave SVG vector grounding into the `#F47721` orange footer with mandatory institutional attribution: `Designed and Developed by IEDC CEV · CAFETERIA · College of Engineering Vadakara`.
  - `src/components/ApiHealthBadge.tsx`: Standalone pill badge monitoring `/health` status with primary orange accent.
  - `src/app/page.tsx`: Operations Command Center with persistent `AdminSidebar` navigation rail, role-based entry redirection (`staff` -> `/orders`, `retail` -> `/inventory`, `printer` -> `/printer`), real kitchen order queue stream, pantry low-stock alerts, registered teachers directory metric, real-time dynamic SVG financial velocity chart, Teachers Pay Later live logs with settled/unsettled dues status, Today's Live Payments ledger, and Excel export.
  - `src/app/financial/page.tsx`: Dedicated Financial Ledger displaying dual-view real-time payment transaction logs (Razorpay API live logs + Database ledger) alongside a dedicated Bank Settlements tab streaming payout batches directly from Razorpay API (`/v1/settlements`), live search, and simplified 3-column Excel export.
  - `src/app/developer/page.tsx`: Developer Console restricted exclusively to `developer` with system diagnostics (payment mode, webhook health, runtime) and user role authority table (`GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/role`) supporting all 5 admin roles + Customer.
  - `src/app/orders/page.tsx`: Kitchen dispatch and live order management dashboard for `developer`, `admin`, and `staff` with status tab pills (`all`, `ORDER_PLACED`, `COLLECTED`), search pill, stage badges, Pay Later payment indicators, items checklist drawer, and direct links to scan/complete orders.
  - `src/app/orders/receipt/page.tsx`: Cashier printable register bill layout (`@media print`) powered by `GET /api/v1/admin/orders/:id/receipt`.
  - `src/app/scan/page.tsx`: Optical QR code scanner powered by dual-engine `BarcodeDetector` and `jsQR` frame analysis, featuring animated target viewfinder with laser sweep (`animate-scanner-laser`), front/rear camera toggle, flashlight toggle, QR screenshot file upload decoder, Web Audio scan chime, haptic vibration, interactive order packing checklist, and instant "Dispatch Meal (Mark as Collected)" fulfillment action.
  - `src/app/printer/page.tsx`: Dedicated hardware kiosk & thermal bill printer interface for `printer` role (and kitchen staff) with auto-focused scanner stroke capture, automated token submission via `/api/v1/admin/orders/collect-qr`, live ESC/POS thermal receipt preview, auto-print triggering, and hardware settings.
  - `src/app/wallets/page.tsx`: Customer testing wallet management, search pill, balance adjustment modal, and customer ledger dialog in clean white & orange design.
  - `src/app/inventory/page.tsx`: Pantry inventory management with low-stock alerts, stock quantity editing drawer, 1-click toggles, and responsive 2-column mobile box cards (`grid grid-cols-2 gap-3 md:hidden`) alongside high-density desktop table. Accessible to `developer`, `admin`, `staff`, and `retail`.
  - `src/app/login/page.tsx`: Restricted admin sign-in with clean white & orange container card, directing users to their designated role dashboard upon authentication.
  - `src/app/forgot-password/page.tsx`: Administrator password recovery request card.
  - `src/app/reset-password/page.tsx`: Administrator password reset submission card.
  - `src/app/staff-requests/page.tsx`: Teachers Management portal enabling administrators to directly register new faculty teachers with email, password, and Teacher ID, or assign existing accounts to teacher status with full revocation capabilities.
  - `src/app/menu/page.tsx`: Unified Menu Management portal integrating both Menu Item catalog management and Category configuration via a dual-tab switcher (`Menu Dishes` vs `Categories`), featuring responsive 2-column mobile box cards (`grid grid-cols-2 gap-3 md:hidden`), category addition, editing modal, sorting, active toggling, dish editing, archiving, permanent dish deletion, and fixed image upload presigning.
  - `src/app/unauthorized/page.tsx`: Access denied screen for non-admin accounts.
  - `src/app/not-found.tsx`: Clean 404 administration error page.
  - `src/context/AdminAuthContext.tsx`: Admin session provider verifying 5-tier roles (`developer`, `admin`, `staff`, `retail`, `printer`) with permission flags (`isDeveloper`, `isAdmin`, `isStaff`, `isRetail`, `isPrinter`, `canAccessDeveloper`, `canAccessDashboard`, `canManageUsers`, `canManageInventory`, `canUpdateStockOnly`, `canManageMenu`, `canManageOrders`, `canScanQr`, `canReviewStaff`, `canViewReports`).
  - `src/lib/supabase.ts`: Singleton browser client for Supabase Auth.

### 2.3 Backend API (`backend/`)
* **Role:** Single source of truth for database operations, authentication, payments, QR verification, uploads, menu catalog, reporting, and business logic.
* **Stack:** Hono framework, TypeScript (Strict), Cloudflare Workers, Wrangler (`^4.158.0`), `@cloudflare/workers-types` (`^5.20261107.1`), Zod, Vitest, `xlsx`.
* **Target:** Cloudflare Workers (Global Edge Network).
* **Dev Port:** `8787` (`http://localhost:8787`).
* **Key Files:**
  - `src/index.ts`: Primary Hono router, global middleware binding, route mounting, and 404/error handler.
  - `src/middleware/auth.ts`: Reusable `requireAuth` (Bearer token verification), `requireRole(allowedRoles)`, `requireAdmin`, and `requireDeveloper` middlewares with context caching.
  - `src/middleware/cors.ts`: Dynamic CORS origin matching against `ALLOWED_ORIGINS` binding with localhost and 127.0.0.1 port allowances and Idempotency-Key header support.
  - `src/middleware/logger.ts`: Sanitized JSON request logger redacting authorization headers and sensitive query parameters.
  - `src/middleware/error.ts`: Centralized error handling returning structured JSON envelopes.
  - `src/lib/razorpay.ts`: Standard Razorpay payment gateway client, order generation, checkout signature verification, webhook signature verification, and live payments listing (`fetchRazorpayPayments`) using Web Crypto HMAC SHA-256 and constant-time comparison.
  - `src/lib/supabase.ts`: Token verification and database profile retrieval (`id`, `display_name`, `avatar_key`, `account_type`, `app_role`, `created_at`, `updated_at`) via Supabase Admin/User clients.
  - `src/lib/storage/`: Provider-independent storage service (`types.ts`, `supabaseProvider.ts`, `r2Provider.ts`, `index.ts`).
  - `src/routes/health.ts`: Unauthenticated `/health` check reporting uptime, worker version, and timestamp.
  - `src/routes/api.ts`: `/api/v1` router mounting all sub-routers.
  - `src/routes/auth.ts`: `GET /api/v1/auth/me` and `PATCH /api/v1/auth/me/profile` for updating display name and avatar key.
  - `src/routes/admin.ts`: `GET /api/v1/admin/me`, `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/role`, and `GET /api/v1/admin/diagnostics`.
  - `src/routes/reports.ts`: Financial metrics `GET /api/v1/admin/reports/stats` (with dynamic time-series buckets, live Razorpay today payments, and teachers count), live Razorpay payments `GET /api/v1/admin/reports/razorpay-payments`, payments ledger `GET /api/v1/admin/reports/payments`, fund flow `GET /api/v1/admin/reports/funds`, and 3-column simplified Excel workbook export `GET /api/v1/admin/reports/export` (`Order No`, `Payment Date`, `Total Payment Money`).
  - `src/routes/webhooks.ts`: Razorpay webhook listener `POST /api/v1/webhooks/razorpay` with raw payload HMAC SHA-256 signature verification and event deduplication via `payment_webhook_events`.
  - `src/routes/staffRequests.ts`: Admin endpoints for reviewing staff requests as well as direct teacher administration without Teacher ID: `GET /teachers/list`, `GET /teachers/candidates`, `POST /teachers/create`, `POST /teachers/assign`, and `POST /teachers/revoke`.
  - `backend/migrations/0009_add_profile_email.sql`: Migration script adding `email text` to `public.profiles` with backfill from `auth.users` and sync via `handle_new_user()`.
  - `src/routes/categories.ts`: Public `GET /api/v1/categories` (with strict `Cache-Control: no-store` revalidation headers), Admin `GET`, `POST`, `PATCH /api/v1/admin/categories`.
  - `src/routes/menu.ts`: Public `GET /api/v1/menu` (with strict `Cache-Control: no-store` revalidation headers), Admin `GET`, `POST`, `PATCH`, `DELETE /api/v1/admin/menu`.
  - `src/routes/uploads.ts`: Unified storage endpoints `POST /presign`, `POST /verify`, `GET /avatar`, `PUT /mock-sink`.
  - `src/routes/cart.ts`: Cart item locking endpoints `POST /api/v1/cart/lock`, `POST /api/v1/cart/unlock`, `POST /api/v1/cart/release-all`, `GET /api/v1/cart/status`.
  - `src/routes/orders.ts`: Customer endpoints `POST /api/v1/orders` (supports `razorpay`, `testing_wallet`, `counter_cash`, and faculty `pay_later`, returning explicit `id` and `order_id`), `POST /api/v1/orders/verify-payment` (supports optional `order_id` with fallback lookup by `razorpay_order_id`), `GET /api/v1/orders/me` (returns `order_stage`), `GET /api/v1/orders/pay-later/pending`, `POST /api/v1/orders/pay-later/settle`, `GET /:id`, `GET /:id/receipt`. Customer cancellation endpoint permanently removed.
  - `src/routes/adminOrders.ts`: Admin endpoints `GET /api/v1/admin/orders` (role-checked), `GET /:id`, `POST /:id/ready` (`ORDER_PLACED` -> `READY_TO_PICK`), `PATCH /:id/status`, `POST /verify-qr` (accessible to `staff`, validates 10:00 PM IST cutoff), `POST /collect-qr` (direct collection by QR token, rejects expired orders with `QR_EXPIRED`), `POST /:id/collect` (accessible to `staff`), `GET /:id/receipt`.
  - `src/utils/orderExpiry.ts`: Order QR verification token expiration utility calculating exact 10:00 PM IST (UTC+05:30) canteen service day cutoff.
  - `src/routes/adminInventory.ts`: Admin endpoints `GET /api/v1/admin/inventory`, `PATCH /:menuItemId` and `PUT /:menuItemId` (protected with `requireRole(['developer', 'admin', 'retail'])`).
  - `src/routes/wallet.ts`: Customer endpoints `GET /api/v1/wallet/me`, `GET /api/v1/wallet/transactions`.
  - `src/routes/adminWallet.ts`: Admin endpoints `GET /api/v1/admin/wallets`, `GET /:customerId`, `POST /:customerId/adjust`.
  - `src/types/env.ts`: AppRole enum (`developer`, `admin`, `retail`, `staff`, `customer`), Payment interface, PaymentWebhookEvent interface.
  - `supabase/migrations/20261124000000_remove_teacher_id_and_fix_stock_locks.sql`: Migration script dropping `teacher_id`, updating `handle_new_user()`, and decoupling `lock_cart_item` from physical inventory decrements.
  - `supabase/migrations/20261124000001_database_cleanup.sql`: Database cleanup migration dropping unused table `storage_assets`, obsolete request columns from `profiles`, non-negative inventory constraint, and security-hardened `lock_cart_item()` with explicit `SET search_path = public`.

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
