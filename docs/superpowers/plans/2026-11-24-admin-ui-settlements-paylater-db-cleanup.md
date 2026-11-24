# Admin 2-Column Mobile UI, Pay Later Ledger, Bank Settlements, Password Modal & DB Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Admin inventory and menu item lists into 2-column mobile box cards, surface a real-time Teachers Pay Later ledger beneath the dashboard chart, auto-close the customer password change modal with a prominent confirmation banner, integrate Razorpay bank account settlement logs into the financial portal with user setup guidance, fix the cart quantity stock lock barrier, and deliver a comprehensive database cleanup script.

**Architecture:**
- **Admin Mobile UI:** Responsive Tailwind CSS (`md:hidden` grid for 2-column box cards + `hidden md:block` table for desktop) across `admin/src/app/inventory/page.tsx` and `admin/src/app/menu/page.tsx`.
- **Pay Later Ledger:** Backend reporting endpoint `GET /api/v1/admin/reports/pay-later-logs` reading `orders` where `payment_method = 'pay_later'` and presenting live settlement status (`Settled` vs `Due / Unsettled`) on the Admin dashboard below the velocity chart.
- **Bank Settlements:** Backend integration `fetchRazorpaySettlements()` connecting to `https://api.razorpay.com/v1/settlements`, exposed via `GET /api/v1/admin/reports/razorpay-settlements`, rendered in a dedicated "Settlements" tab in `admin/src/app/financial/page.tsx`.
- **Customer Settings Modal:** Close password change dialog immediately upon success and display a persistent 4-second confirmation banner at the top of the settings page.
- **Stock Barrier & Database Cleanup:** Fix cart `+` button disable state when stock is reached; provide clean, non-destructive SQL migration script dropping unused tables (`storage_assets`), obsolete profile columns (`staff_approval_status`, etc.), and decoupling `lock_cart_item` from physical inventory decrements.

**Tech Stack:** Next.js 16.4.6, React 19, TypeScript, Tailwind CSS, Hono on Cloudflare Workers, Supabase PostgreSQL, Razorpay Settlements API (`/v1/settlements`).

---

## Global Constraints
- Strictly zero monorepo workspaces (independent `customer`, `admin`, `backend`).
- Both Next.js frontends deploy via static export (`output: 'export'`).
- Zero comments inside source code files (`.ts`, `.tsx`, `.js`, `.css`) per `AGENTS.md`.
- Keep documentation synced in `project_memory.md`, `design.md`, and `changelogs.md`.

---

## Tasks

### Task 1: Customer Password Change Modal Auto-Close & Confirmation Banner
**Files:**
- Modify: `customer/src/app/settings/page.tsx`

- [ ] Add `pageNotice` state (`{ type: 'success' | 'error'; message: string } | null`) to `customer/src/app/settings/page.tsx`.
- [ ] In `handleChangePassword`, when `supabase.auth.updateUser` succeeds:
  - Close modal immediately: `setShowPasswordModal(false)`.
  - Reset form fields: `setNewPassword('')`, `setConfirmPassword('')`.
  - Set page notice: `setPageNotice({ type: 'success', message: 'Password updated successfully!' })`.
  - Set a 4-second timeout to clear `pageNotice`.
- [ ] Render the page notice banner at the top of the settings content area (above the profile card).
- [ ] Verify clean compilation with `npm run typecheck` in `customer/`.

---

### Task 2: Stock Check Logic & Plus Button Disabling
**Files:**
- Modify: `customer/src/app/cart/page.tsx`
- Modify: `customer/src/context/CartContext.tsx`
- Modify: `backend/src/routes/orders.ts`

- [ ] In `customer/src/app/cart/page.tsx`:
  - When `cartError` occurs with `INSUFFICIENT_STOCK`, immediately mark that item in local state so the `+` button is disabled (`isAtMaxStock = true`).
  - Ensure `track_inventory` defaults correctly if item came from previous cart sessions.
  - Disable the `+` button whenever `maxStock <= 0` or `item.quantity >= maxStock` with gray styling (`bg-stone-200 text-stone-400 cursor-not-allowed`).
- [ ] In `backend/src/routes/orders.ts`:
  - Ensure order placement allows purchasing full available stock (`item.stock_quantity < reqItem.quantity` triggers error only when strictly requesting more than available).
- [ ] Run backend vitest suite to ensure all order tests pass.

---

### Task 3: Admin Inventory Management 2-Column Mobile Box Cards
**Files:**
- Modify: `admin/src/app/inventory/page.tsx`

- [ ] Add responsive 2-column mobile box cards (`grid grid-cols-2 gap-3 md:hidden`) for pantry inventory items.
- [ ] Each mobile card features:
  - Category tag & dish name.
  - Price (₹) and current stock badge (with green/amber/red styling based on `low_stock_threshold`).
  - Tracking status indicator (`Tracked` vs `Untracked`).
  - 1-click availability toggle (`Available` vs `86`).
  - "Restock / Edit" button that opens the edit drawer.
- [ ] Retain the dense table view for desktop and tablet screens (`hidden md:block`).
- [ ] Verify clean compilation with `npm run typecheck` in `admin/`.

---

### Task 4: Admin Menu Management 2-Column Mobile Box Cards
**Files:**
- Modify: `admin/src/app/menu/page.tsx`

- [ ] In `admin/src/app/menu/page.tsx`, update the dishes list on mobile (`md:hidden`) into a 2-column box card grid (`grid grid-cols-2 gap-3 md:hidden`).
- [ ] Each mobile card features:
  - Dish catalog image or utensils placeholder icon.
  - Dish name, category badge, and price (₹).
  - Kitchen availability toggle button (`Available` vs `Unavailable`).
  - Edit and Delete / Archive action buttons.
- [ ] Retain the dense table view for desktop screens (`hidden md:block`).
- [ ] Verify clean compilation with `npm run typecheck` in `admin/`.

---

### Task 5: Backend Pay Later Logs & Dashboard Integration
**Files:**
- Modify: `backend/src/routes/reports.ts`
- Modify: `admin/src/app/page.tsx`

- [ ] In `backend/src/routes/reports.ts`:
  - Create endpoint `GET /api/v1/admin/reports/pay-later-logs` (protected by `requireAuth` and `requireRole(['developer', 'admin'])`).
  - Query `orders` with `payment_method = 'pay_later'` and `order_status != 'cancelled'`, joining customer profile (`display_name`, `email`, `phone_number`).
  - Return formatted list with order token, teacher details, total in paise and INR, `payment_status` (`paid` vs `unpaid`), `order_stage`, created timestamp, and settlement timestamp/method (`pay_later_settled_via`, `pay_later_settled_at`).
- [ ] In `admin/src/app/page.tsx`:
  - Beneath the "Real-time Financial Velocity" SVG chart in `<main className="xl:col-span-8 space-y-6">`, add a dedicated section: "Faculty Pay Later Ledger".
  - Display summary pill badges: Total Outstanding Due (₹) and Total Settled (₹).
  - Display list/table of recent Pay Later orders with Teacher Name, Order #, Total (₹), Date/Time, and Status badge:
    - Green badge: `Settled` (with settled date & method).
    - Amber/Rose badge: `Due (Unsettled)`.
  - Include quick link to `/financial` or `/orders`.

---

### Task 6: Razorpay Bank Settlements Backend & Financial Tab
**Files:**
- Modify: `backend/src/lib/razorpay.ts`
- Modify: `backend/src/routes/reports.ts`
- Modify: `admin/src/app/financial/page.tsx`

- [ ] In `backend/src/lib/razorpay.ts`:
  - Implement `fetchRazorpaySettlements(env: Env, options?: { count?: number; skip?: number; from?: number; to?: number })`.
  - Query `https://api.razorpay.com/v1/settlements` with Basic Auth.
- [ ] In `backend/src/routes/reports.ts`:
  - Implement `GET /api/v1/admin/reports/razorpay-settlements`.
  - Return mapped settlement objects (`id`, `amount_inr`, `fees_inr`, `tax_inr`, `status`, `utr`, `created_at`).
- [ ] In `admin/src/app/financial/page.tsx`:
  - Add 3rd tab: `Bank Settlements (Razorpay -> Bank)`.
  - Display live settlements table with Settlement ID, Dispatched Amount (₹), Bank UTR Reference, Fees/Tax deducted, Status (`processed` / `created`), and Date.
  - Surface an informational banner explaining the automated Razorpay bank settlement cycle (T+1/T+2 days) and setup requirements.

---

### Task 7: Database Cleanup Script & Guidance
**Files:**
- Create: `supabase/migrations/20261124000001_database_cleanup.sql`

- [ ] Write SQL script to:
  - Drop unused table `public.storage_assets`.
  - Drop deprecated columns from `public.profiles` (`requested_account_type`, `approved_account_type`, `staff_approval_status`, `reviewed_by`, `reviewed_at`, `teacher_id`).
  - Ensure `lock_cart_item()` does not deduct physical `menu_items.stock_quantity`.
- [ ] Document exact commands and provide them in the response with step-by-step instructions.

---

### Task 8: Verification & Documentation
**Files:**
- Modify: `changelogs.md`
- Modify: `project_memory.md`

- [ ] Run `npm run typecheck` and `npm run build` across `customer`, `admin`, and `backend`.
- [ ] Run backend vitest suite (`npm run test`).
- [ ] Scan and remove any comments from modified files per `AGENTS.md`.
- [ ] Update `project_memory.md` and `changelogs.md`.
