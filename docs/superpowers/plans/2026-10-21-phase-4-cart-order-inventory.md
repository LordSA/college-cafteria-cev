# Phase 4: Cart, Order Management & Inventory Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, concurrency-safe cart, order placement, order status tracking, and inventory management system across customer, admin, and backend applications with atomic PostgreSQL operations and zero real payments.

**Architecture:** Client-side persisted shopping cart validated authoritatively by a Hono REST API running on Cloudflare Workers; atomic order placement, stock deduction, and cancellation restoration orchestrated via PostgreSQL stored procedures with row-level locks; strict Row Level Security (RLS) isolating customer orders while granting operational access to verified admins.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React, Hono REST API, Cloudflare Workers, Supabase PostgreSQL with RLS & PL/pgSQL, Zod, Vitest.

**Spec:** Phase 4 requirements prompt provided in user request.

## Global Constraints
- Zero Monorepo Workspaces: customer, admin, and backend maintain independent dependencies and configs.
- Strict Decoupling: Frontends must never implement Next.js API routes; all business logic lives in `backend/`.
- Static Export Only: Next.js frontends deploy via static HTML export (`output: 'export'`).
- Port Allocation: customer: 3000, admin: 3001, backend: 8787.
- Zero Comments: All production source code (`.ts`, `.tsx`, `.js`, `.css`) must have zero comments.
- Payment Boundary: No real payments or Razorpay webhooks in Phase 4; orders start with payment status `unpaid`.

## Review Focus
1. Concurrency and overselling: Multiple customers ordering the last stock item simultaneously must result in exactly one order succeeding and others receiving an insufficient stock error without database corruption.
2. Idempotency replay: Repeating an order placement with identical idempotency key must return the original order without deducting stock again or creating a duplicate.
3. Order tampering: Client-supplied prices, totals, customer IDs, and fulfillment statuses must be completely ignored in favor of server calculations.
4. Cancellation eligibility: Customers must not be allowed to cancel orders in `preparing`, `ready_for_pickup`, or `completed` states.
5. Stock restoration: Order cancellation must restore inventory exactly once and log the restoration event.

---

### Task 1: Database Migrations for Inventory, Orders, Order Items & RLS

**Files:**
- Create: `backend/migrations/0004_orders_and_inventory.sql`
- Create: `supabase/migrations/20261021000000_orders_and_inventory.sql`

- [ ] Write SQL migration altering `menu_items` with `track_inventory`, `stock_quantity`, and `low_stock_threshold`.
- [ ] Create `public.orders` table with human-readable order number, UUID, statuses, timestamps, and idempotency key constraint.
- [ ] Create `public.order_items` table storing item snapshot names, unit prices, quantities, and line totals in paise.
- [ ] Create `public.inventory_logs` table for movement auditing.
- [ ] Enable RLS on `orders`, `order_items`, and `inventory_logs` with customer ownership and admin policies.
- [ ] Implement `public.place_order` stored procedure with row locks (`FOR UPDATE`), stock verification, atomic deduction, and snapshot creation.
- [ ] Implement `public.cancel_order` stored procedure with state validation, atomic stock restoration, and audit logging.
- [ ] Implement `public.update_inventory_stock` stored procedure for admin stock management.
- [ ] Mirror migration into `supabase/migrations/`.

---

### Task 2: Backend REST API Endpoints & Validation

**Files:**
- Modify: `backend/src/types/env.ts`
- Create: `backend/src/routes/orders.ts`
- Create: `backend/src/routes/adminOrders.ts`
- Create: `backend/src/routes/adminInventory.ts`
- Modify: `backend/src/routes/api.ts`

- [ ] Add TypeScript interfaces for orders, order items, inventory logs, and status transitions in `backend/src/types/env.ts`.
- [ ] Implement `POST /api/v1/orders` with Zod validation, token extraction, idempotency verification, and database atomic order execution.
- [ ] Implement `GET /api/v1/orders/me` and `GET /api/v1/orders/:id` with strict customer ownership checks.
- [ ] Implement `POST /api/v1/orders/:id/cancel` for customer cancellation.
- [ ] Implement `GET /api/v1/admin/orders` and `GET /api/v1/admin/orders/:id` with status filtering and pagination.
- [ ] Implement `PATCH /api/v1/admin/orders/:id/status` enforcing the state machine (`pending -> confirmed -> preparing -> ready_for_pickup -> completed`).
- [ ] Implement `GET /api/v1/admin/inventory` and `PATCH /api/v1/admin/inventory/:menuItemId`.
- [ ] Mount routes in `backend/src/routes/api.ts`.
- [ ] Verify clean compilation with `npm --prefix backend run typecheck`.

---

### Task 3: Backend Automated Tests (Vitest)

**Files:**
- Create: `backend/tests/phase4.test.ts`

- [ ] Write unit and integration tests for order creation validation (missing items, invalid quantities, zero price spoofing).
- [ ] Write tests for idempotency key behavior (duplicate submission returning original order).
- [ ] Write tests for customer order authorization (preventing customer A from reading customer B's order).
- [ ] Write tests for inventory stock checking and out-of-stock rejection.
- [ ] Write tests for admin order status transitions and unauthorized customer rejection.
- [ ] Write tests for order cancellation rules and stock restoration logic.
- [ ] Execute `npm --prefix backend run test` and ensure 100% pass rate.

---

### Task 4: Customer Cart State & Navigation Integration

**Files:**
- Create: `customer/src/context/CartContext.tsx`
- Modify: `customer/src/app/layout.tsx`
- Modify: `customer/src/components/Header.tsx`
- Modify: `customer/src/app/menu/page.tsx`

- [ ] Create `CartContext` with `localStorage` persistence, managing items (`id`, `name`, `price`, `image_url`, `quantity`), totals, add, remove, increment, decrement, and clear actions.
- [ ] Wrap root customer layout with `CartProvider`.
- [ ] Add shopping cart badge and orders link in `customer/src/components/Header.tsx`.
- [ ] Add "Add to Cart" and quantity counter controls to `customer/src/app/menu/page.tsx` for available dishes.
- [ ] Ensure disabled / sold-out dishes cannot be added to cart.

---

### Task 5: Customer Cart & Checkout Review Pages

**Files:**
- Create: `customer/src/app/cart/page.tsx`
- Create: `customer/src/app/checkout/page.tsx`

- [ ] Build `/cart` page with line item breakdown, image thumbnails, quantity adjustment, subtotal/total calculation, and clear cart option.
- [ ] Build `/checkout` page verifying live prices from API before submission, generating an idempotency key, submitting `POST /api/v1/orders`, displaying unpaid development notice, and clearing cart upon success.
- [ ] Handle error states (insufficient stock, unavailable items, unauthenticated state).

---

### Task 6: Customer Order History & Status Tracking Pages

**Files:**
- Create: `customer/src/app/orders/page.tsx`
- Create: `customer/src/app/orders/[id]/page.tsx`

- [ ] Build `/orders` listing past and active orders for the authenticated customer with order numbers, timestamps, and status badges.
- [ ] Build `/orders/[id]` detailed order tracking page displaying live status progress steps (`pending` -> `confirmed` -> `preparing` -> `ready_for_pickup` -> `completed`), item breakdown in ₹, and active "Cancel Order" button for eligible statuses.
- [ ] Verify customer ownership boundary and unauthorized access states.

---

### Task 7: Admin Order Management Dashboard

**Files:**
- Create: `admin/src/app/orders/page.tsx`
- Modify: `admin/src/components/Header.tsx`
- Modify: `admin/src/app/page.tsx`

- [ ] Add "Orders" navigation link to admin header.
- [ ] Build `/orders` page with status tab filters (`All`, `Pending`, `Confirmed`, `Preparing`, `Ready`, `Completed`, `Cancelled`), order number search, and expandable item details.
- [ ] Add status transition buttons (`Confirm Order`, `Start Cooking`, `Mark Ready for Pickup`, `Complete Order`, `Cancel Order`) with feedback.
- [ ] Update admin dashboard (`admin/src/app/page.tsx`) with active order counts.

---

### Task 8: Admin Inventory Management Dashboard

**Files:**
- Create: `admin/src/app/inventory/page.tsx`
- Modify: `admin/src/components/Header.tsx`

- [ ] Add "Inventory" navigation link to admin header.
- [ ] Build `/inventory` page displaying dishes with current stock, low-stock threshold, track inventory toggle, and availability state.
- [ ] Implement stock adjustment dialog / inline update sending `PATCH /api/v1/admin/inventory/:id`.
- [ ] Add visual alerts for items falling below low-stock threshold.

---

### Task 9: Verification, Documentation & Zero-Comments Clean Up

**Files:**
- Create: `docs/orders.md`
- Create: `docs/inventory.md`
- Create: `docs/cart-and-checkout.md`
- Modify: `project_memory.md`
- Modify: `changelogs.md`
- Modify: `README.md`

- [ ] Write comprehensive technical documentation in `docs/orders.md`, `docs/inventory.md`, and `docs/cart-and-checkout.md`.
- [ ] Run zero comments verification check on all created and modified source files (`.ts`, `.tsx`, `.js`, `.css`).
- [ ] Run typecheck across all three applications (`backend`, `customer`, `admin`).
- [ ] Run production static export build across `customer` and `admin`.
- [ ] Run test suite in `backend` ensuring all tests pass.
- [ ] Update `changelogs.md`, `project_memory.md`, and `README.md`.
