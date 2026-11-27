# Daily Stock Reset & Canteen Closed Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated midnight daily stock reset for designated menu categories (clearing `stock_quantity` to 0 so canteen staff enters today's fresh batch each morning), and provide a real-time admin sliding toggle that transitions the customer portal into a full-page "We Are Closed" state.

**Architecture:**
- **Daily Stock Reset:** Adds `daily_reset` boolean to `categories` (no extra columns needed on `menu_items`, as existing `stock_quantity` is utilized). Introduces an atomic database stored procedure `public.reset_daily_category_stock()` triggered via Cloudflare Workers Cron (`30 18 * * *` UTC = 00:00 IST), backed by lazy midnight catch-up in API endpoints and a manual admin trigger.
- **Canteen Status & Closed Mode:** Adds `store_settings` table storing `{ "is_open": boolean, "message": string }`. Replaces the search bar in the admin dashboard header (`admin/src/app/page.tsx`) with a tactile sliding Open/Closed toggle. In the customer application, introduces a real-time `StoreStatusProvider` that blocks menu/ordering actions and displays a full-page, campus-branded "We Are Closed" screen whenever the canteen is closed, automatically recovering when re-opened.

**Tech Stack:**
- Backend: Hono 4.6, Cloudflare Workers, TypeScript 5.7, PostgreSQL / Supabase, Zod
- Admin: Next.js 16 (App Router, Static Export), Tailwind CSS, Lucide React
- Customer: Next.js 16 (App Router, Static Export), Tailwind CSS, Lucide React

**Spec & Memory References:**
- [project_memory.md](../../../project_memory.md) (Architecture, 5-tier roles, backend routes, migration register)
- [design.md](../../../design.md) (Warm orange theme `#F47721`, pure white admin canvas, mobile shell)
- [changelogs.md](../../../changelogs.md) (Phase 5.1 baseline)
- [AGENTS.md](../../../AGENTS.md) (Strict zero-comment mandate in `.ts`, `.tsx`, `.js`, `.css`, static export compatibility)

---

## Global Constraints

- **Zero Monorepo Workspaces:** Maintain isolated dependencies in `customer/`, `admin/`, and `backend/`.
- **Zero Source Code Comments:** No developer comments (`//`, `/* */`, `{/* */}`) in modified `.ts`, `.tsx`, `.js`, `.css` files.
- **Static Export Parity:** Frontends must build with `output: 'export'` without Next.js `/api/*` routes.
- **Port Allocation:** Customer on `3000`, Admin on `3001`, Backend on `8787`.
- **IST Timezone Alignment:** Midnight daily stock reset operates on Indian Standard Time (IST = UTC+05:30; 00:00 IST is 18:30 UTC).

## Review Focus

1. **Midnight Boundary & Idempotency:** Does `reset_daily_category_stock()` safely execute multiple times on the same date without corrupting inventory logs or wiping fresh stock entered after midnight?
2. **Fresh Stock Workflow:** When `stock_quantity` resets to 0 at midnight for items with `track_inventory = true`, does `is_available` properly reflect out-of-stock until the canteen staff enters today's fresh batch in the inventory tab?
3. **Hard Order Rejection:** Does `POST /api/v1/orders` strictly reject checkout attempts if `is_open = false`, preventing race conditions where a customer started checkout before the slider was flipped?
4. **Real-time Recovery:** Does the customer "We Are Closed" screen poll or detect status recovery so users do not stay permanently blocked after the admin re-opens the canteen?
5. **Admin Sliding Button UX:** Does the new sliding button in `admin/src/app/page.tsx` provide immediate visual feedback, tactile transitions, and error rollbacks if the network fails?

---

## Tasks

### Task 1: Database Schema & Migration (`0016_daily_reset_and_store_status.sql`)

**Files:**
- Create: `backend/migrations/0016_daily_reset_and_store_status.sql`
- Create: `supabase/migrations/20261127000000_daily_reset_and_store_status.sql`

- [ ] **Step 1: Write migration SQL script**
  - Add `daily_reset boolean NOT NULL DEFAULT false` to `public.categories`.
  - Update `inventory_logs` check constraint to allow `reason IN ('order_placed', 'manual_adjustment', 'restock', 'daily_reset')`.
  - Create table `public.store_settings`:
    ```sql
    CREATE TABLE IF NOT EXISTS public.store_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
    );
    ```
  - Insert seed record:
    ```sql
    INSERT INTO public.store_settings (key, value)
    VALUES ('canteen_status', '{"is_open": true, "message": "Canteen is open for orders", "last_daily_reset_date": ""}'::jsonb)
    ON CONFLICT (key) DO NOTHING;
    ```
  - Create stored procedure `public.reset_daily_category_stock()`:
    - Finds active categories with `daily_reset = true`.
    - Resets `menu_items.stock_quantity = 0` for all items with `track_inventory = true` in those categories.
    - Sets `menu_items.is_available = false` for tracked items with 0 stock (or `true` if `track_inventory = false`).
    - Inserts audit rows into `public.inventory_logs` with `reason = 'daily_reset'`.
    - Updates `last_daily_reset_date` in `public.store_settings`.
  - Configure RLS policies for `public.store_settings` (public can `SELECT`; authenticated users with role `developer`, `admin`, `staff` can `UPDATE`).

- [ ] **Step 2: Sync migration to `supabase/complete_setup.sql`**
  - Ensure local development and fresh database setups include the new columns and functions.

---

### Task 2: Backend API Endpoints & Scheduled Worker Cron

**Files:**
- Modify: `backend/src/routes/categories.ts`
- Modify: `backend/src/routes/adminInventory.ts`
- Modify: `backend/src/routes/orders.ts`
- Modify: `backend/src/routes/api.ts`
- Modify: `backend/src/types/env.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/wrangler.toml`
- Create: `backend/src/routes/storeStatus.ts`
- Test: `backend/tests/store_status_and_daily_reset.test.ts`

- [ ] **Step 1: Update category schemas & routes in `backend/src/routes/categories.ts`**
  - Add `daily_reset: z.boolean().default(false)` to `CategoryCreateSchema` and `CategoryUpdateSchema`.
  - Return `daily_reset` in public and admin category list responses.

- [ ] **Step 2: Create `backend/src/routes/storeStatus.ts`**
  - Mount public endpoint `GET /api/v1/store-status`:
    - Returns `{ success: true, data: { is_open: boolean, message: string, updated_at: string } }` with `Cache-Control: no-store`.
  - Mount admin endpoint `PATCH /api/v1/admin/store-status`:
    - Protected by `requireAuth` and `requireRole(['developer', 'admin', 'staff'])`.
    - Validates payload: `{ is_open: z.boolean(), message: z.string().optional() }`.
    - Updates `store_settings` table row `key = 'canteen_status'`.
    - Returns updated status.

- [ ] **Step 3: Guard order placement in `backend/src/routes/orders.ts`**
  - In `POST /api/v1/orders`, query `store_settings` where `key = 'canteen_status'`.
  - If `is_open === false`, reject order placement immediately with `400 CANTEEN_CLOSED` ("The canteen is currently closed. Orders cannot be accepted at this time.").

- [ ] **Step 4: Implement scheduled handler & midnight catch-up**
  - In `backend/wrangler.toml`, add:
    ```toml
    [triggers]
    crons = ["30 18 * * *"] # 00:00 IST daily
    ```
  - In `backend/src/index.ts`, add Worker `scheduled(event, env, ctx)` export:
    - Calls `adminClient.rpc('reset_daily_category_stock')`.
  - In `backend/src/routes/adminInventory.ts`, add manual endpoint:
    - `POST /api/v1/admin/inventory/daily-reset` to trigger `reset_daily_category_stock()` on-demand.
  - In `backend/src/routes/menu.ts` or `categories.ts`, add lazy midnight catch-up check:
    - If current IST date != `last_daily_reset_date`, call `reset_daily_category_stock()`.

- [ ] **Step 5: Write unit tests in `backend/tests/store_status_and_daily_reset.test.ts`**
  - Test `GET /api/v1/store-status` returns open status by default.
  - Test `PATCH /api/v1/admin/store-status` updates status.
  - Test `POST /api/v1/orders` fails when canteen is closed.
  - Run `npm run test` in `backend` to verify all tests pass.

---

### Task 3: Admin Dashboard UI: Sliding Canteen Toggle & Category Reset Controls

**Files:**
- Modify: `admin/src/app/page.tsx`
- Modify: `admin/src/app/menu/page.tsx`

- [ ] **Step 1: Replace Search with Sliding Canteen Status Toggle in `admin/src/app/page.tsx`**
  - Remove the search input box from lines 410-418 in `admin/src/app/page.tsx`.
  - Add state `isCanteenOpen: boolean`, `statusLoading: boolean`, `togglePending: boolean`.
  - Fetch initial status on mount from `GET /api/v1/store-status`.
  - Build tactile sliding toggle button:
    - Left state / Green: `Open` with store/sun icon and green pulse ring.
    - Right state / Red-Amber: `Closed` with moon/lock icon and red accent.
    - Sliding pill thumb with smooth spring transition (`transition-transform duration-300`).
    - Tooltip / Status label: "Canteen Status: Open for orders" vs "Canteen Status: Closed".
  - Handle toggle action with optimistic update and `PATCH /api/v1/admin/store-status`.
  - If API call fails, revert state and display error notification.

- [ ] **Step 2: Add Daily Reset Toggle to Category Management in `admin/src/app/menu/page.tsx`**
  - In Category interface: add `daily_reset: boolean`.
  - In "Add Menu Category" form:
    - Add custom styled switch: `Daily Stock Reset` with subtitle: `"Automatically reset all dish stocks in this category to 0 at 12:00 AM daily"`.
    - Bind to `catDailyReset` state.
  - In "Edit Category" modal:
    - Add the same switch to toggle `daily_reset` for existing categories.
  - In Category list (desktop table & mobile cards):
    - Add badge: `Reset 12 AM` (green pill if enabled, gray pill if disabled).

---

### Task 4: Customer Application: Real-Time "We Are Closed" Portal

**Files:**
- Create: `customer/src/context/StoreStatusContext.tsx`
- Create: `customer/src/components/CanteenClosedView.tsx`
- Create: `customer/src/app/closed/page.tsx`
- Modify: `customer/src/app/layout.tsx`
- Modify: `customer/src/components/Navbar.tsx`
- Modify: `customer/src/components/MobileBottomNav.tsx`

- [ ] **Step 1: Create `StoreStatusContext` in `customer/src/context/StoreStatusContext.tsx`**
  - State: `isOpen: boolean`, `closedMessage: string`, `loading: boolean`, `checkStatus: () => Promise<void>`.
  - Fetches `/api/v1/store-status` on initial load.
  - Sets up periodic background polling (every 20 seconds) and checks on window focus.
  - Exposes `useStoreStatus()` hook.

- [ ] **Step 2: Create `CanteenClosedView.tsx`**
  - Full-screen, warm campus-branded presentation matching `design.md`:
    - Floating animated badge with moon / clock icon (`Clock` or `MoonStar`).
    - Clean typography: `"We Are Currently Closed"`.
    - Informative body text: `"Our kitchen is currently resting or preparing fresh batches. Ordering is paused until we open."`
    - Operating Hours badge: `"Operating Hours: 8:00 AM – 7:00 PM (Mon – Sat)"`.
    - Live refresh button (`"Check If Open"` with loading spinner).
    - Customer Support link: Button to navigate to `/support` for inquiries or complaints.
    - Institutional attribution: `"College of Engineering Vadakara · Cafeteria CEV"`.

- [ ] **Step 3: Integrate guard in `customer/src/app/layout.tsx`**
  - Wrap application in `<StoreStatusProvider>`.
  - When `isOpen === false`:
    - On ordering routes (`/`, `/menu`, `/cart`, `/checkout`): render `<CanteenClosedView />` and suppress checkout / cart interactions.
    - Allow essential account routes if user is viewing historical orders (`/orders`, `/orders/track`, `/orders/receipt`, `/support`, `/settings`).
    - Hide or disable active ordering buttons in `<MobileBottomNav />`.

- [ ] **Step 4: Create dedicated `/closed` static page in `customer/src/app/closed/page.tsx`**
  - Ensures static export compliance (`output: 'export'`) with standalone bookmarkable URL.

---

### Task 5: Zero-Comment Cleanup, Build Verification & Documentation Sync

**Files:**
- Modify: `project_memory.md`
- Modify: `design.md`
- Modify: `changelogs.md`
- Modify: `README.md`
- Modify: `docs/inventory.md`
- Modify: `docs/api.md`

- [ ] **Step 1: Enforce zero comments mandate**
  - Run comment verification script across `backend/src`, `customer/src`, and `admin/src`.
  - Delete any temporary commentary, block comments, or file headers.

- [ ] **Step 2: Run typecheck and builds**
  - Execute `npm run typecheck` across `backend`, `customer`, and `admin`.
  - Execute `npm run build` across `customer` and `admin` to verify static HTML export parity.

- [ ] **Step 3: Synchronize documentation**
  - Update `project_memory.md` with new `store_settings` schema, `storeStatus.ts` routes, and `0016` migration.
  - Update `design.md` with Admin Sliding Button and Customer Closed View specifications.
  - Update `changelogs.md` under `## [Unreleased]`.
  - Update `README.md` with new endpoints and feature highlights.
  - Update `docs/inventory.md` and `docs/api.md` with daily stock reset and store status documentation.
