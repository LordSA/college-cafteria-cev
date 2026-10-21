# Phase 4.1: Testing Wallet, QR Order Verification and Bill Printing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a demo testing wallet with ledger auditing, wallet checkout, secure cryptographic QR order verification, admin QR scanner & manual entry, order collection lifecycle, and browser-printable receipts.

**Architecture:** Additive PostgreSQL schema with `wallets` and `wallet_transactions` tables; atomic PL/pgSQL stored procedures for wallet adjustments, wallet checkout, and order collection; REST API endpoints under `/api/v1/wallet` and `/api/v1/admin/*`; Next.js customer wallet & QR success views, and admin QR scanner & printable receipt layouts.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React, Hono REST API, Cloudflare Workers, Supabase PostgreSQL with RLS, Zod, Vitest.

**Spec:** Phase 4.1 requirements prompt provided in user request.

## Global Constraints
- Zero Monorepo Workspaces: customer, admin, and backend maintain independent dependencies and configs.
- Strict Decoupling: No Next.js API routes; all database and business logic in `backend/`.
- Static Export Only: Next.js frontends deploy via static HTML export (`output: 'export'`).
- Port Allocation: customer: 3000, admin: 3001, backend: 8787.
- Zero Comments: All production source code (`.ts`, `.tsx`, `.js`, `.css`) must have zero comments.
- Demo Credits Only: Prominently label "Testing Wallet — Demo Credits Only. No Real Money." Real payment gateways remain deferred to Phase 5.

## Review Focus
1. Wallet Balance Boundary: Customer balance must never be negative, and cannot be updated directly by client queries (enforced via database triggers/RLS and atomic RPC).
2. Atomic Wallet Checkout: Deducting wallet balance, recording ledger debit, and marking order paid must happen in a single atomic transaction; partial deduction on insufficient funds must never occur.
3. QR Cryptographic Safety: QR codes encode an opaque verification token; QR scans alone must never mark orders paid or collected without explicit authorized backend action.
4. Concurrency on Collection: Multiple operators scanning the same QR ticket concurrently must result in exactly one successful collection, with second attempts returning a clear conflict response.
5. Print CSS: Printable bills must render cleanly in standard 8.5x11 / A4 browser print dialogs (`@media print`) without broken dark backgrounds or clipped items.

---

### Task 1: Database Migrations for Wallets, Transactions, and Order Verification

**Files:**
- Create: `backend/migrations/0005_wallet_and_qr_verification.sql`
- Create: `supabase/migrations/20261021000001_wallet_and_qr_verification.sql`
- Modify: `supabase/complete_setup.sql`

- [ ] Create `public.wallets` table (`id`, `customer_id`, `balance` >= 0, timestamps).
- [ ] Create `public.wallet_transactions` table (`id`, `wallet_id`, `amount`, `transaction_type`, `balance_after`, `reason`, `order_id`, `actor_id`, `created_at`).
- [ ] Alter `public.orders` adding `payment_method` (text default 'testing_wallet'), `paid_at` (timestamptz), `qr_verification_token` (text unique), `collected_at` (timestamptz), `collected_by` (uuid).
- [ ] Enable RLS on `wallets` and `wallet_transactions` restricting customer access to own records and admin full access.
- [ ] Implement `public.adjust_wallet_balance` stored procedure for admin credits/debits with reason and negative balance prevention.
- [ ] Implement `public.pay_order_with_wallet` stored procedure for atomic stock check, inventory deduction, wallet balance check, wallet debit, and order payment update.
- [ ] Implement `public.collect_order` stored procedure for atomic order collection verification and completion.
- [ ] Mirror migration to Supabase directory and update `complete_setup.sql`.

---

### Task 2: Backend REST API Endpoints & Validation

**Files:**
- Modify: `backend/src/types/env.ts`
- Create: `backend/src/routes/wallet.ts`
- Create: `backend/src/routes/adminWallet.ts`
- Modify: `backend/src/routes/orders.ts`
- Modify: `backend/src/routes/adminOrders.ts`
- Modify: `backend/src/routes/api.ts`

- [ ] Add TypeScript types for `Wallet`, `WalletTransaction`, and payment method in `backend/src/types/env.ts`.
- [ ] Implement customer endpoints: `GET /api/v1/wallet/me` and `GET /api/v1/wallet/transactions`.
- [ ] Implement admin endpoints: `GET /api/v1/admin/wallets`, `GET /api/v1/admin/wallets/:customerId`, `POST /api/v1/admin/wallets/:customerId/adjust`.
- [ ] Extend `POST /api/v1/orders` to support `payment_method: 'testing_wallet'` with atomic wallet deduction and QR token generation.
- [ ] Implement QR verification and collection endpoints: `POST /api/v1/admin/orders/verify-qr` and `POST /api/v1/admin/orders/:id/collect`.
- [ ] Implement receipt retrieval endpoint: `GET /api/v1/orders/:id/receipt`.
- [ ] Mount new routes in `backend/src/routes/api.ts`.
- [ ] Verify clean compilation with `npm --prefix backend run typecheck`.

---

### Task 3: Backend Automated Tests (Vitest)

**Files:**
- Create: `backend/tests/phase4_1.test.ts`

- [ ] Write unit/integration tests for wallet initialization, balance retrieval, and transactions.
- [ ] Write tests for admin credit, debit, and negative-balance prevention.
- [ ] Write tests for wallet checkout: successful payment, insufficient balance rejection, and idempotency.
- [ ] Write tests for QR verification token validation, expired/invalid token handling, and unauthorized access rejection.
- [ ] Write tests for order collection: successful collection, duplicate collection conflict rejection.
- [ ] Write tests for receipt endpoint authorization and data snapshot integrity.
- [ ] Execute `npm --prefix backend run test` and ensure all tests pass.

---

### Task 4: Customer Wallet Balance, Checkout & QR Payment Success

**Files:**
- Create: `customer/src/app/wallet/page.tsx`
- Create: `customer/src/app/checkout/success/page.tsx`
- Modify: `customer/src/components/Header.tsx`
- Modify: `customer/src/app/checkout/page.tsx`
- Modify: `customer/src/app/orders/track/page.tsx`

- [ ] Add "Wallet" link and current balance chip to `customer/src/components/Header.tsx`.
- [ ] Build `/wallet` page showing current testing balance, demo credits disclaimer, and transaction history ledger.
- [ ] Update `/checkout` with testing wallet balance check, payment method selector ("Testing Wallet — Demo Credits"), and direct payment execution.
- [ ] Build `/checkout/success` page displaying payment confirmation, token number, and SVG QR code for counter verification.
- [ ] Update `/orders/track` to display the QR verification code on paid orders with print/receipt button.

---

### Task 5: Admin Wallet Adjustments, QR Scanner & Order Collection

**Files:**
- Create: `admin/src/app/wallets/page.tsx`
- Create: `admin/src/app/scan/page.tsx`
- Modify: `admin/src/components/Header.tsx`
- Modify: `admin/src/app/orders/page.tsx`
- Modify: `admin/src/app/page.tsx`

- [ ] Add "Wallets" and "QR Scanner" links to `admin/src/components/Header.tsx`.
- [ ] Build `/wallets` page allowing admins to search customers, view balance, add/deduct demo credits with mandatory reason, and view audit ledger.
- [ ] Build `/scan` page with HTML5 camera scanner and manual order reference / QR token entry input.
- [ ] Add order verification display with customer info, payment status, item checklist, and "Confirm Order Collection" button.
- [ ] Update admin orders queue (`/orders`) to indicate payment method and collected status.
- [ ] Update admin dashboard (`/`) metrics with testing wallet balances and collection stats.

---

### Task 6: Printable Bill Layout & Receipt Generation

**Files:**
- Create: `customer/src/app/orders/receipt/page.tsx`
- Create: `admin/src/app/orders/receipt/page.tsx`

- [ ] Build clean, high-contrast, print-optimized receipt layout (`@media print`) showing Cafteria branding, order number, timestamp, itemized breakdown, total, testing wallet payment badge, and verification QR code.
- [ ] Add "Print Bill / Receipt" button triggering `window.print()`.

---

### Task 7: Verification, Documentation & Zero-Comments Clean Up

**Files:**
- Create: `docs/testing-wallet.md`
- Create: `docs/qr-verification.md`
- Modify: `project_memory.md`
- Modify: `changelogs.md`
- Modify: `README.md`
- Modify: `supabase/complete_setup.sql`

- [ ] Document testing wallet and QR verification architecture in `docs/testing-wallet.md` and `docs/qr-verification.md`.
- [ ] Verify zero comments across all modified source code (`.ts`, `.tsx`, `.js`, `.css`).
- [ ] Run typechecks and static export builds across all applications.
- [ ] Run backend test suite.
- [ ] Update `changelogs.md`, `project_memory.md`, and `README.md`.
