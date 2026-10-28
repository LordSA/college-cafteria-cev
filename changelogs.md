# Changelogs — Cafteria Platform

All notable changes to the Cafteria platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to Semantic Versioning.

> **Rule Requirement:** Developers and automated agents **MUST** log every codebase modification, file creation, or schema change in this file under an appropriate section.

---

## [Unreleased]

---

## [0.4.3] - 2026-10-28

### Added
- **Mobile-First App Shell & Home UI Revamp (`customer/src/app/page.tsx`)**:
  - Implemented top gradient header (`from-[#ff5e3a] via-[#ff7043] to-[#ffa040]`) with `rounded-b-[2.5rem]`, personalized greeting ("Hi Kaliraj" / dynamic profile name), and location indicator ("Sayalkudi").
  - Top-right 3-line hamburger menu button opening an accessible slide-over navigation drawer.
  - Integrated floating search bar with search and filter controls.
  - Circular category horizontal carousel (Hotels/Meals, Coffee, Gifts, Juice, Cake, Pizza, Fruits) with interactive category filtering.
  - "Top rated near you" horizontal card carousel featuring ratings (`★ 4.4`), cuisine tags, prep times (`⏱ 12 Min`), pricing, and one-tap "+ Add" / quantity steppers.
  - "Exclusive Deals" section featuring 3 circular gradient offer badges (Flat 50% OFF, Flat 60% OFF, Flat 30% OFF).
  - "Available & Hot in Kitchen Now" live product catalog connected to backend menu feed.
- **Mobile Bottom Navigation Bar (`customer/src/components/MobileBottomNav.tsx`)**:
  - Persistent bottom dock on mobile screens (`md:hidden`) featuring the 4 requested destinations: `Home`, `Menu`, `Cart`, and `Profile`.
  - Active route highlighting using red/coral rounded pill container matching reference mobile design.
  - Real-time cart item count badge on Cart tab.
  - Mounted globally in `customer/src/app/layout.tsx`.
- **Slide-Over Navigation Sidebar Drawer (`customer/src/components/SidebarDrawer.tsx`)**:
  - Slide-in navigation drawer with backdrop blur, user profile card, campus location, quick links, operating hours, and auth actions.
- **Desktop PC Experience — Amazon.in Reference (`customer/src/components/AmazonHeader.tsx` & `customer/src/app/page.tsx`)**:
  - Amazon.in style primary top navigation (`#131921`) with campus delivery selector, broad search input with category dropdown, accounts & lists menu, past orders link, and shopping cart counter.
  - Secondary sub-navigation bar (`#232f3e`) with `☰ All` department drawer trigger, rush hour schedule, and meal category shortcuts.
  - Campus promotional hero banner and responsive multi-column catalog grid.
  - Amazon-style multi-column desktop footer with "Back to top" action.

### Fixed
- **PostgREST Schema Cache & Profile Relational Queries**:
  - Resolved `Could not find a relationship between 'orders' and 'customer_id' in the schema cache` error in `backend/src/routes/adminOrders.ts` and `backend/src/routes/adminWallet.ts`.
  - Migrated embedded relation syntax (`profiles:customer_id(...)`) to resilient, decoupled batch profile lookups (`in('id', customerIds)` against `public.profiles`).
  - Added additive migration `0006_foreign_keys_profiles.sql` (`supabase/migrations/20261022000000_foreign_keys_profiles.sql`) establishing explicit foreign key constraints (`fk_orders_customer_profile`, `fk_wallets_customer_profile`, `fk_wallet_tx_customer_profile`) from `public.orders`, `public.wallets`, and `public.wallet_transactions` to `public.profiles(id)` with PostgREST schema cache reload signal (`NOTIFY pgrst, 'reload schema'`).
  - Appended migration to `supabase/complete_setup.sql`.

---

## [0.4.2] - 2026-10-22

### Added
- **Phase 4.2: Strict Order Stages, QR Lifecycle & Collection Flow**:
  - **Database Migrations (`backend/migrations/0007_phase4_2_order_stages_and_qr_lifecycle.sql` & `supabase/migrations/20261022000001_phase4_2_order_stages_and_qr_lifecycle.sql`):**
    - Added `order_stage text NOT NULL DEFAULT 'ORDER_PLACED' CHECK (order_stage IN ('ORDER_PLACED', 'READY_TO_PICK', 'COLLECTED'))` to `public.orders`.
    - Added `qr_consumed_at timestamptz` to `public.orders` to permanently expire QR verification tokens upon collection.
    - Added stored procedure `mark_order_ready(p_order_id UUID)` to atomically transition paid orders from `ORDER_PLACED` to `READY_TO_PICK`.
    - Updated stored procedure `verify_qr_token(p_qr_token TEXT)` with stage-aware evaluation returning `is_eligible_for_collection` (true only if `READY_TO_PICK`) and distinct `ineligibility_reason` messages (`"Order is not ready for pickup yet"` or `"Order already collected"`).
    - Updated stored procedure `collect_order(p_order_id UUID, p_operator_id UUID)` to enforce `order_stage = 'READY_TO_PICK'`, transition to `COLLECTED`, set `qr_consumed_at = now()`, and prevent duplicate collections.
    - Updated `pay_order_with_wallet` to initialize orders with `order_stage = 'ORDER_PLACED'`.
    - Appended migrations and procedures to `supabase/complete_setup.sql`.
  - **Backend REST API Endpoints (`backend/src/routes/`):**
    - `POST /api/v1/admin/orders/:id/ready`: Transitions order from `ORDER_PLACED` to `READY_TO_PICK` with payment checks.
    - `POST /api/v1/admin/orders/verify-qr`: Non-mutating QR pre-flight verification endpoint returning stage eligibility and ineligibility reasons without auto-collecting.
    - `POST /api/v1/admin/orders/:id/collect`: Atomic collection endpoint enforcing `READY_TO_PICK`, recording operator ID, and expiring QR token.
    - `GET /api/v1/admin/orders?stage={all|ORDER_PLACED|READY_TO_PICK|COLLECTED}`: Filter admin queue by the 3 strict stages.
    - `GET /api/v1/orders/me` & `GET /api/v1/orders/:id`: Return authoritative `order_stage`.
    - Added 13 automated Vitest tests (`backend/tests/phase4_2.test.ts`), bringing total passing test suite to 76/76 tests.
  - **Customer Web Application (`customer/`):**
    - `/orders`: Updated order status badges to show strict 3 stages (`ORDER_PLACED`, `READY_TO_PICK`, `COLLECTED`).
    - `/orders/track`: Simplified timeline to the 3 canonical stages, added prominent "Ready to Pick Up!" alert banner, and conditionally disabled QR SVG with an "Order Already Collected" card when collected.
    - `/checkout/success`: Updated confirmation view to indicate `ORDER_PLACED` stage.
    - `/orders/receipt`: Added `order_stage` to bill metadata and rendered "Order Collected" stamp when fulfilled.
  - **Admin Web Application (`admin/`):**
    - `/orders`: Restructured queue into strict 3 tabs (`Order Placed`, `Ready to Pick`, `Collected`), added `Mark Ready to Pick` button for stage 1, and `Scan QR / Collect Order` quick link for stage 2.
    - `/scan`: Integrated stage pre-flight evaluation; shows `"Order is not ready for pickup yet"` warning with 1-click `"Mark Ready to Pick"` action; shows `"Order already collected"` banner with disabled actions; enables `"Confirm Order Collection"` only when `READY_TO_PICK`.
    - Operations Command Center (`admin/src/app/page.tsx`): Updated active order count to check strict order stage.
  - **Documentation:**
    - `docs/order-lifecycle.md`: Comprehensive lifecycle state diagram, API reference, stored procedures, error table, and 5-step curl verification walkthrough.

---

## [0.4.1] - 2026-10-22

### Added
- **Phase 4.1: Testing Wallet, QR Order Verification and Bill Printing**:
  - **Database Migrations (`backend/migrations/0005_wallet_and_qr_verification.sql` & `supabase/migrations/20261021000001_wallet_and_qr_verification.sql`):**
    - Created `public.wallets` with integer `balance >= 0` in paise and customer foreign key.
    - Created `public.wallet_transactions` storing immutable ledger audit history (`credit`, `debit`, balance after, reason, order reference, actor ID).
    - Altered `public.orders` to include `payment_method` (`testing_wallet`, `counter_cash`, `razorpay`), `paid_at`, `qr_verification_token` (unique), `collected_at`, and `collected_by`.
    - Added RLS policies isolating customer wallet records and restricting modifications to verified administrators.
    - Implemented atomic PL/pgSQL stored procedures:
      - `adjust_wallet_balance`: Prevents negative balances, locks wallet row with `FOR UPDATE`, and records auditable ledger transaction.
      - `pay_order_with_wallet`: Atomically validates stock, decrements inventory, checks wallet balance, debits wallet, creates paid order, and generates secure opaque QR verification token.
      - `verify_qr_token`: Admin verification procedure checking QR token validity and collection eligibility.
      - `collect_order`: Prevents duplicate collection, validates paid status, and records operator ID and timestamp.
    - Updated `supabase/complete_setup.sql` with Phase 4.1 tables, columns, indexes, and stored procedures.
  - **Backend REST API Endpoints (`backend/src/routes/`):**
    - `GET /api/v1/wallet/me`: Returns customer testing wallet balance in paise and formatted string.
    - `GET /api/v1/wallet/transactions`: Returns customer transaction ledger history.
    - `GET /api/v1/admin/wallets`: Admin customer wallet search and balance overview.
    - `GET /api/v1/admin/wallets/:customerId`: Admin customer detail with recent transactions.
    - `POST /api/v1/admin/wallets/:customerId/adjust`: Admin demo credit adjustment with mandatory audit reason.
    - Extended `POST /api/v1/orders`: Supports `payment_method: 'testing_wallet'` with atomic wallet deduction and fallback logic.
    - `POST /api/v1/admin/orders/verify-qr`: Admin QR pass verification endpoint returning item checklist and collection eligibility.
    - `POST /api/v1/admin/orders/:id/collect`: Admin order collection endpoint updating terminal `completed` state.
    - `GET /api/v1/orders/:id/receipt`: Customer receipt snapshot retrieval endpoint.
    - `GET /api/v1/admin/orders/:id/receipt`: Cashier register receipt retrieval endpoint.
    - Added 13 automated Vitest tests (`backend/tests/phase4_1.test.ts`), bringing total passing test suite to 63/63 tests.
  - **Customer Web Application (`customer/`):**
    - `QRCodeSvg.tsx`: Zero-dependency SVG vector QR code rendering component.
    - `Header.tsx`: Added Testing Wallet balance indicator chip linking directly to `/wallet`.
    - `/wallet`: Customer Testing Wallet page displaying current demo balance, non-monetary disclaimer ("Testing Wallet — Demo Credits Only. No Real Money"), and transaction history ledger.
    - `/checkout`: Added payment method selector ("Testing Wallet — Demo Credits" vs "Pay at Counter"), real-time balance validation, and direct wallet checkout.
    - `/checkout/success`: Order confirmation page featuring pickup token, SVG QR pass for counter verification, and receipt printing action.
    - `/orders/track`: Updated with live pickup QR pass on paid orders and receipt navigation.
    - `/orders/receipt`: Print-friendly (`@media print`) receipt layout with Cafteria branding, itemized charges, and verification QR code.
  - **Admin Web Application (`admin/`):**
    - `QRCodeSvg.tsx`: Zero-dependency SVG QR code rendering component.
    - `Header.tsx`: Added "Wallets" and "QR Scanner" navigation links.
    - `/wallets`: Customer wallet management panel with search, balance adjustment modal (credit/debit with mandatory reason), and customer ledger audit dialog.
    - `/scan`: Counter QR scanner with camera view, manual token fallback, order verification display, and 1-click "Confirm Order Collection" action.
    - `/orders`: Updated queue with payment method badges, collected status timestamps, and receipt buttons.
    - `/orders/receipt`: Printable cashier register bill layout (`@media print`).
    - Operations Command Center (`admin/src/app/page.tsx`): Added "QR Scanner & Collection" and "Testing Wallets" subsystem action cards.
  - **Documentation:**
    - `docs/testing-wallet.md`: Testing wallet architecture, security boundaries, non-negative balance prevention, and API contracts.
    - `docs/qr-verification.md`: Cryptographic QR order verification, collection eligibility state machine, and print stylesheets.

---

## [0.4.0] - 2026-10-21

### Added
- **Phase 4: Cart, Order Management & Inventory Control**:
  - **Database Migrations (`backend/migrations/0004_orders_and_inventory.sql` & `supabase/migrations/20261021000000_orders_and_inventory.sql`):**
    - Extended `public.menu_items` with `track_inventory` (boolean), `stock_quantity` (integer >= 0), and `low_stock_threshold` (integer >= 0).
    - Created `public.orders` with human-readable order number, customer foreign key, order status (`pending`, `confirmed`, `preparing`, `ready_for_pickup`, `completed`, `cancelled`), payment status (`unpaid`, `pending`, `paid`, `failed`, `refunded`), integer subtotal/total in paise, idempotency key constraint, and fulfillment timestamps.
    - Created `public.order_items` storing item name snapshot, unit price snapshot in paise, quantity, and line total in paise.
    - Created `public.inventory_logs` recording movement quantity deltas, reason codes (`order_placed`, `order_cancelled`, `manual_adjustment`, `restock`), order reference, and acting user ID.
    - Implemented PostgreSQL Row Level Security (RLS) policies isolating customer order visibility and granting management permissions exclusively to verified admins.
    - Implemented stored procedures `place_order` (with `FOR UPDATE` row locks, atomic stock deduction, idempotency verification, and total calculation) and `cancel_order` (with terminal status protection, atomic stock restoration, and audit logging).
  - **Backend REST API Endpoints (`backend/src/routes/`):**
    - `POST /api/v1/orders`: Server-authoritative order placement with Zod validation, token verification, and idempotency protection.
    - `GET /api/v1/orders/me`: Customer order history listing.
    - `GET /api/v1/orders/:id`: Customer single order details with ownership enforcement.
    - `POST /api/v1/orders/:id/cancel`: Customer cancellation endpoint validating permitted states and restoring inventory.
    - `GET /api/v1/admin/orders`: Operations order listing with status filtering (`pending`, `confirmed`, etc.), order number search, and pagination.
    - `PATCH /api/v1/admin/orders/:id/status`: Admin status transition endpoint enforcing the lifecycle state machine and updating audit timestamps.
    - `GET /api/v1/admin/inventory`: Inventory catalog with `low_stock_only` filtering.
    - `PATCH /api/v1/admin/inventory/:menuItemId`: Stock adjustment, threshold setting, inventory tracking toggle, and 86 availability toggle.
    - Added 12 new automated Vitest tests (`backend/tests/phase4.test.ts`), bringing total passing tests to 50/50.
  - **Customer Web Application (`customer/`):**
    - `CartContext.tsx`: Client-side persistent cart in `localStorage` (`cafteria_customer_cart`) with item add, quantity stepper, clear, and totals computation.
    - `/cart`: Full shopping cart page with line item breakdown, price formatting in ₹, and clear cart option.
    - `/checkout`: Order review page with live server availability validation, idempotency key generation, and unpaid development flow notice.
    - `/orders`: Customer order record board displaying status badges, creation timestamps, and links to live trackers.
    - `/orders/track`: Dedicated live order tracking page with visual fulfillment steps (`pending` -> `confirmed` -> `preparing` -> `ready_for_pickup` -> `completed`), order items breakdown, and self-cancellation button.
    - Floating bottom cart bar on `/menu` with active dish counter and total amount in ₹.
  - **Admin Web Application (`admin/`):**
    - `/orders`: Operational kitchen dispatch queue with status tab filters, order number search, expandable item checklists, and transition controls.
    - `/inventory`: Pantry inventory table with low-stock warnings, stock adjustment modal, and 1-click 86 availability toggles.
    - Operations Command Center (`admin/src/app/page.tsx`): Updated live metric counters for active kitchen orders and inventory alerts.
  - **Documentation:**
    - `docs/orders.md`: Detailed order lifecycle, state machine, idempotency key strategy, and payment boundary handoff.
    - `docs/inventory.md`: Inventory tracking model, concurrency locking (`FOR UPDATE`), depletion and restoration rules, and movement audit schema.
    - `docs/cart-and-checkout.md`: Client-side cart persistence, server validation boundary, and Phase 5 payment handoff.

### Added
- **Admin Operations Command Center Enhancement (`admin/src/app/page.tsx` & `admin/src/components/Header.tsx`):**
  - Upgraded unauthenticated landing experience to present a full dark-theme Cafteria Operations command center with prominent "Sign In to Operations" CTA, subsystem previews (Menu, Categories, Staff Approvals, KDS, Inventory, Audits), and customer app crossover link.
  - Implemented live operational metrics for authenticated administrators fetching real-time dish count, in-stock count, active category count, and pending staff requests queue from `/api/v1/admin/*` edge endpoints.
  - Added quick-access command cards with dynamic badge counters and roadmap indicators for upcoming modules.
  - Added inline 403 unauthorized handler allowing instant account switching without infinite spinner locks.
  - Added unauthenticated "Sign In" button in `Header.tsx` to streamline administrator access from any page.
  - Verified static HTML export compatibility (`11/11` static pages generated) and zero comments compliance.

---

## [0.3.0] - 2026-10-20

### Added
- **Phase 3: Menu Management, Email Verification, Staff Approval & Temporary Supabase Storage**:
  - **Storage Provider Architecture (`backend/src/lib/storage/`):**
    - Introduced provider-independent storage interface (`IStorageProvider`).
    - Implemented `SupabaseStorageProvider` as active temporary provider (`STORAGE_PROVIDER=supabase`).
    - Preserved `R2StorageProvider` for future Cloudflare R2 activation (`STORAGE_PROVIDER=r2`).
    - Support for two storage buckets: `food-images` (public read, admin-only upload) and `profile-images` (private by default, short-lived signed URLs).
    - Added database migrations `backend/migrations/0003_storage_buckets.sql` and `supabase/migrations/20261020000002_storage_buckets.sql` configuring buckets and Storage RLS policies.
    - Added endpoints: `POST /api/v1/uploads/presign`, `POST /api/v1/uploads/verify`, `GET /api/v1/uploads/avatar`.
    - Added comprehensive Vitest test suite (`backend/tests/storage.test.ts`) covering 14 test cases.
  - **Menu & Category Management (`backend/src/routes/`):**
    - Created `public.categories` and `public.menu_items` tables with integer paise pricing (`backend/migrations/0002_staff_approvals_and_menu.sql`).
    - Public endpoints: `GET /api/v1/categories`, `GET /api/v1/menu`.
    - Admin endpoints: `GET`, `POST`, `PATCH` for categories; `GET`, `POST`, `PATCH`, `DELETE` for menu items.
    - Vitest automated tests covering menu creation, price validation, category ordering, and item archiving.
  - **Staff Approval Security Workflow:**
    - Explicit separation of `requested_account_type`, `approved_account_type`, and `staff_approval_status`.
    - Safe default trigger `handle_new_user()` setting `approved_account_type = 'student'` and `pending` for staff requests.
    - Security Definer function `review_staff_request()` callable only by verified administrators.
    - Administrative endpoints `GET /api/v1/admin/staff-requests`, `POST /:id/approve`, `POST /:id/reject`.
  - **Customer Web Application (`customer/`):**
    - Overhauled customer landing page (`/`) with live Phase 3 status, prominent "Browse Today's Menu" and "Create Campus Account" CTA buttons, live menu feed highlight card, and canteen service operating windows.
    - Optimized `ApiHealthBadge` to be fully responsive on mobile smartphones without text wrapping.
    - Registration flow with confirm password, terms acceptance, and redirect to OTP verification.
    - `/verify-email`: 6-digit OTP verification page with resend cooldown timer using `supabase.auth.verifyOtp`.
    - `/forgot-password` and `/reset-password` recovery pages.
    - `/menu`: Public canteen catalog browsing with search, category filtering, and ₹ price formatting.
    - `/profile`: Added email verification status badge, staff review badge, and profile picture upload/display.
  - **Admin Web Application (`admin/`):**
    - `/staff-requests`: Operational review board for pending staff account approvals.
    - `/categories`: Category creation and active toggle controls.
    - `/menu`: Menu management with 86 availability toggles, soft archiving, and food image upload via presigned URLs.
    - `/forgot-password` and `/reset-password` administrator recovery pages.
    - Updated navigation header and dashboard links.
  - **Documentation:**
    - `docs/storage.md`: Complete storage provider specification, bucket configuration, Storage RLS policies, and R2 migration steps.
    - `docs/staff-approval.md`: Zero-trust staff approval workflow specification.
    - `docs/menu-management.md`: Menu and catalog architecture specification.

---

## [0.2.0] - 2026-10-20

### Added
- **Phase 2: Authentication, Authorization & Database Security**:
  - **Database Migrations (`backend/migrations/0001_create_profiles.sql` & `supabase/migrations/`):**
    - `public.profiles` table linked to `auth.users` with cascading deletion.
    - Check constraints for `account_type` (`student`, `staff`) and `app_role` (`customer`, `admin`).
    - `handle_new_user()` trigger on `auth.users` enforcing safe customer default role.
    - `protect_profile_roles()` trigger preventing unauthorized updates to `app_role` or `account_type`.
    - Row Level Security (RLS) policies for user self-view, self-update, and administrator read/write access.
    - `is_admin()` security definer function avoiding recursive RLS.
  - **Backend API (`backend/`):**
    - `@supabase/supabase-js` integration for server-side token verification and profile retrieval.
    - Reusable `requireAuth` middleware validating Bearer access tokens.
    - Reusable `requireAdmin` middleware enforcing administrator role.
    - `GET /api/v1/auth/me` returning authenticated user profile.
    - `GET /api/v1/admin/me` returning verified administrator identity (returns 403 for customers).
    - Vitest automated test suite (`backend/tests/auth.test.ts`) covering 12 test cases.
  - **Customer Web Application (`customer/`):**
    - `@supabase/supabase-js` browser client singleton.
    - `AuthProvider` and `useAuth` hook managing Supabase Auth sessions.
    - `/signup`: User registration with display name, email, password, and student/staff selector.
    - `/login`: User sign-in with validation and redirect protection.
    - `/profile`: Protected user account management displaying credentials, role lock indicator, and logout.
    - Updated `Header` with dynamic user profile link and sign in / sign up actions.
  - **Admin Operations Application (`admin/`):**
    - `@supabase/supabase-js` browser client singleton.
    - `AdminAuthProvider` and `useAdminAuth` hook verifying administrator role against backend API.
    - `/login`: Restricted administrative login with zero public registration.
    - `/unauthorized`: 403 Access Denied screen for customers attempting admin access.
    - `/`: Protected Operations Command Center displaying verified administrator identity and phase placeholders.
    - Updated `Header` with admin identity and logout action.
  - **Documentation & Environment Templates:**
    - `docs/authentication.md`: Complete security specification, RLS policies, admin provisioning guide, and migration steps.
    - Updated `customer/.env.example`, `admin/.env.example`, `backend/.dev.vars.example`.
    - Updated `docs/architecture.md`, `project_memory.md`, and root `README.md`.

---

## [0.1.0] - 2026-10-19

### Added
- **Phase 1: Project Foundation** initial scaffolding:
  - `customer/`: Independent Next.js 14 App Router application configured for Cloudflare Pages static export on Port `3000`.
  - `admin/`: Independent Next.js 14 App Router management dashboard configured for Cloudflare Pages static export on Port `3001`.
  - `backend/`: Independent Cloudflare Worker REST API using Hono on Port `8787`.
  - Configured sanitized request logging in `backend/src/middleware/logger.ts` redacting sensitive headers and tokens.
  - Configured dynamic CORS origin authorization in `backend/src/middleware/cors.ts`.
  - Configured centralized error handling in `backend/src/middleware/error.ts`.
  - Implemented `/health` and `/api/v1` base endpoints in backend.
  - Implemented live `ApiHealthBadge` components in both frontends polling `/health`.
  - Authored primary system architecture specification in `docs/architecture.md`.
