# Role Systems & Permission Modes Reconfiguration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconfigure the customer and administrative authorization architectures into distinct 3-tier customer account types (`student`, `staff_t` [teachers/faculty], `guest`) and 5-tier administrative operations roles (`developer`, `admin`, `staff` [store workers], `retail`, `printer` [hardware kiosk terminal]), completely eliminating naming conflicts in the shared database and establishing strict permission boundaries.

**Architecture:** 
1. Customer identity model isolates campus classification (`account_type`: `'student'` | `'staff_t'` | `'guest'`) where `staff_t` represents verified faculty/teachers with Teacher ID and Pay Later access, while `student` and `guest` diners pay online via Razorpay.
2. Administrative model isolates operational capabilities (`app_role`: `'developer'` | `'admin'` | `'staff'` | `'retail'` | `'printer'`) where `developer` has full access plus debug/user management tools; `admin` has full canteen operations without debug tools; `staff` represents store workers who scan QR tokens, accept checkouts, and manage stock quantities and new portions; `retail` can only adjust existing portion stocks; and `printer` serves as an automated kiosk terminal that scans pickup QR codes and prints bills.
3. No AI features or references in any user interface component.

**Tech Stack:** Next.js 16.4.6 (App Router, Static Export), React 19, TypeScript (Strict), Tailwind CSS, Hono on Cloudflare Workers, Supabase PostgreSQL & Auth, Vitest.

**Spec:** User request (2026-11-21) and architecture docs (`docs/authentication.md`, `docs/staff-approval.md`, `docs/architecture.md`).

---

## Global Constraints

- **Strict Zero Comments**: Zero comments (`//`, `/* */`, `{/* */}`) in any modified or newly created `.ts`, `.tsx`, `.js`, or `.css` production source files per `AGENTS.md`.
- **Zero AI in UI**: No AI widgets, badges, chat bubbles, or AI indicators in the customer or admin user interfaces.
- **Static Export Compatible**: Both frontends must compile cleanly via `npm run build` with `output: 'export'`.
- **Decoupled Architecture**: No monorepo workspace dependencies; independent packages for `customer`, `admin`, and `backend`.
- **Testing Verification**: All Vitest test suites in `backend` must pass with zero failures.

---

## Review Focus

1. **Explicit `staff_t` Separation**: In the shared database, teachers/faculty use `staff_t` for `account_type`, `requested_account_type`, and `approved_account_type`, while canteen workers use `staff` for `app_role`, ensuring zero collision across SQL triggers, queries, and RLS policies.
2. **Guest Registration**: Guest accounts must register seamlessly without Teacher ID requirement, bypass staff approval queues, and default to `account_type = 'guest'`.
3. **Retail Privilege Lockdown**: Users with `app_role = 'retail'` must be blocked by middleware and UI from viewing live orders, scanning QR codes, or adding new menu items.
4. **Developer Tool Isolation**: The `/developer` dashboard and `PATCH /api/v1/admin/users/:id/role` endpoints must be restricted strictly to `developer` and blocked for `admin`.
5. **Printer Kiosk Readiness**: Ensure the `printer` role can authenticate to `/api/v1/admin/orders/collect-qr` and `/api/v1/admin/orders/:id/receipt` for automated hardware bill printing without access to management menus.

---

## Tasks

### Task 1: Supabase Database Schema & Trigger Migration

**Files:**
- Create: `supabase/migrations/20261121000000_reconfigure_roles_and_account_types.sql`
- Modify: `supabase/complete_setup.sql`

**Requirements:**
- Update `public.profiles.account_type` check constraint to allow `('student', 'staff_t', 'guest')`.
- Update `public.profiles.requested_account_type` check constraint to allow `('student', 'staff_t', 'guest')`.
- Update `public.profiles.approved_account_type` check constraint to allow `('student', 'staff_t', 'guest')`.
- Migrate existing rows:
  ```sql
  UPDATE public.profiles SET account_type = 'staff_t' WHERE account_type = 'staff';
  UPDATE public.profiles SET requested_account_type = 'staff_t' WHERE requested_account_type = 'staff';
  UPDATE public.profiles SET approved_account_type = 'staff_t' WHERE approved_account_type = 'staff';
  ```
- Update `public.profiles.app_role` check constraint to allow `('customer', 'developer', 'admin', 'retail', 'staff', 'printer')`.
- Update `handle_new_user()` trigger function:
  - If `raw_user_meta_data->>'account_type' = 'guest'`, set `account_type = 'guest'`, `requested_account_type = 'guest'`, `approved_account_type = 'guest'`, and `staff_approval_status = 'not_requested'`.
  - If `raw_user_meta_data->>'account_type' IN ('staff_t', 'staff')`, set `requested_account_type = 'staff_t'`, `approved_account_type = 'student'`, `account_type = 'student'`, and `staff_approval_status = 'pending'`.
  - Default is `student` with `staff_approval_status = 'not_requested'`.
- Update `review_staff_request(p_target_user_id uuid, p_decision text, p_admin_user_id uuid)`:
  - On approval, set `approved_account_type = 'staff_t'` and `account_type = 'staff_t'`.
- Update `set_user_role(p_target_user_id uuid, p_new_role text)`:
  - Validate `p_new_role IN ('developer', 'admin', 'retail', 'staff', 'printer', 'customer')`.
  - Require caller `app_role = 'developer'`.

- [ ] **Step 1:** Draft SQL migration script `supabase/migrations/20261121000000_reconfigure_roles_and_account_types.sql`.
- [ ] **Step 2:** Sync constraint updates and triggers in `supabase/complete_setup.sql`.

---

### Task 2: Backend API Types & Auth Middleware Updates

**Files:**
- Modify: `backend/src/types/env.ts`
- Modify: `backend/src/lib/supabase.ts`
- Modify: `backend/src/middleware/auth.ts`

**Requirements:**
- In `backend/src/types/env.ts`:
  - `export type AccountType = 'student' | 'staff_t' | 'guest';`
  - `export type AppRole = 'customer' | 'developer' | 'admin' | 'retail' | 'staff' | 'printer';`
  - `export type AdminRole = 'developer' | 'admin' | 'retail' | 'staff' | 'printer';`
- In `backend/src/lib/supabase.ts`:
  - Ensure `verifySupabaseToken()` properly maps `app_role` across all 6 roles and `account_type` across `('student', 'staff_t', 'guest')`.
- In `backend/src/middleware/auth.ts`:
  - Keep `requireDeveloper = requireRole(['developer'])`.
  - Keep `requireAdmin = requireRole(['developer', 'admin'])`.
  - Error messages accurately list required roles.

- [ ] **Step 1:** Update `backend/src/types/env.ts` with new `AccountType` and `AppRole` definitions.
- [ ] **Step 2:** Update `backend/src/lib/supabase.ts` profile mapping.
- [ ] **Step 3:** Run `npm --prefix backend run typecheck` to verify type compatibility.

---

### Task 3: Backend API Endpoints & Role Guard Enforcement

**Files:**
- Modify: `backend/src/routes/admin.ts`
- Modify: `backend/src/routes/adminOrders.ts`
- Modify: `backend/src/routes/adminInventory.ts`
- Modify: `backend/src/routes/menu.ts`
- Modify: `backend/src/routes/categories.ts`
- Modify: `backend/src/routes/staffRequests.ts`
- Modify: `backend/src/routes/reports.ts`
- Modify: `backend/src/routes/orders.ts`

**Requirements:**
- In `backend/src/routes/admin.ts`:
  - `RoleUpdateSchema`: `z.enum(['developer', 'admin', 'retail', 'staff', 'printer', 'customer'])`.
  - `GET /me`: Allow `['developer', 'admin', 'retail', 'staff', 'printer']`.
  - `GET /users`, `GET /diagnostics`, `PATCH /users/:id/role`: Guard with `requireDeveloper` (only Developer has debug & role management tools; Admin is forbidden).
- In `backend/src/routes/adminOrders.ts`:
  - `GET /` (Orders Queue): Guard with `requireRole(['developer', 'admin', 'staff'])` (Retail & Printer excluded).
  - `PATCH /:id/status`, `POST /:id/ready`: Guard with `requireRole(['developer', 'admin', 'staff'])`.
  - `POST /collect-qr`, `POST /verify-qr`, `GET /:id/receipt`: Guard with `requireRole(['developer', 'admin', 'staff', 'printer'])` (Printer kiosk can scan QR to accept checkout and retrieve bill).
- In `backend/src/routes/adminInventory.ts`:
  - `GET /`, `PATCH /:menuItemId`, `PUT /:menuItemId`: Guard with `requireRole(['developer', 'admin', 'staff', 'retail'])`.
  - `POST /` (Add new stock item): Guard with `requireRole(['developer', 'admin', 'staff'])` (Retail can only update existing stocks, not add new items).
- In `backend/src/routes/orders.ts`:
  - Pay later checks: strictly verify `profile.approved_account_type === 'staff_t' && profile.staff_approval_status === 'approved'`.
- In `backend/src/routes/staffRequests.ts`:
  - Faculty/Teacher approval endpoint sets `approved_account_type = 'staff_t'` and `account_type = 'staff_t'`. Guarded by `['developer', 'admin']`.
- In `backend/src/routes/menu.ts`, `backend/src/routes/categories.ts`, `backend/src/routes/reports.ts`:
  - Guard with `requireRole(['developer', 'admin'])`.

- [ ] **Step 1:** Update route middlewares across all backend routes.
- [ ] **Step 2:** Ensure zero comments are added to source files.
- [ ] **Step 3:** Run `npm --prefix backend run typecheck`.

---

### Task 4: Backend Unit Tests Update & Coverage

**Files:**
- Modify: `backend/tests/auth.test.ts`
- Modify: `backend/tests/phase3.test.ts`
- Modify: `backend/tests/phase4.test.ts`
- Modify: `backend/tests/phase4_2.test.ts`

**Requirements:**
- Update mock profiles and test cases to use `staff_t` for teacher profiles and `staff` for store worker admin roles.
- Test `GET /api/v1/admin/users`: Succeeds for `developer`, returns `403 FORBIDDEN` for `admin`.
- Test `POST /api/v1/admin/orders/collect-qr`: Succeeds for `staff` (store worker) and `printer`, returns `403 FORBIDDEN` for `retail`.
- Test `POST /api/v1/admin/inventory`: Succeeds for `staff`, returns `403 FORBIDDEN` for `retail`.
- Test `PATCH /api/v1/admin/inventory/:id`: Succeeds for both `staff` and `retail`.
- Test `GET /api/v1/admin/orders/:id/receipt`: Succeeds for `printer`.
- Test registration with `account_type = 'guest'` creates a profile with `account_type = 'guest'` and `staff_approval_status = 'not_requested'`.

- [ ] **Step 1:** Update test files with `staff_t` and new roles.
- [ ] **Step 2:** Run `npm --prefix backend run test` and confirm all tests pass.

---

### Task 5: Admin Auth Context & Role Mode Matrix

**Files:**
- Modify: `admin/src/context/AdminAuthContext.tsx`
- Modify: `admin/src/components/AdminSidebar.tsx`
- Modify: `admin/src/components/Header.tsx`
- Modify: `admin/src/app/page.tsx`
- Modify: `admin/src/app/login/page.tsx`
- Modify: `admin/src/app/developer/page.tsx`
- Modify: `admin/src/app/inventory/page.tsx`
- Modify: `admin/src/app/staff-requests/page.tsx`
- Create: `admin/src/app/printer/page.tsx`

**Requirements:**
- In `admin/src/context/AdminAuthContext.tsx`:
  - `export type AppRole = 'developer' | 'admin' | 'staff' | 'retail' | 'printer' | 'customer';`
  - `export type AdminRole = 'developer' | 'admin' | 'staff' | 'retail' | 'printer';`
  - Expose permission flags:
    - `isDeveloper: role === 'developer'`
    - `isAdmin: role === 'admin'`
    - `isStaff: role === 'staff'` (Store worker)
    - `isRetail: role === 'retail'`
    - `isPrinter: role === 'printer'`
    - `canAccessDeveloper: isDeveloper`
    - `canAccessDashboard: isDeveloper || isAdmin`
    - `canManageOrders: isDeveloper || isAdmin || isStaff`
    - `canScanQr: isDeveloper || isAdmin || isStaff || isPrinter`
    - `canManageInventory: isDeveloper || isAdmin || isStaff` (add + update)
    - `canUpdateStockOnly: isRetail` (update only)
    - `canManageMenu: isDeveloper || isAdmin`
    - `canReviewStaff: isDeveloper || isAdmin`
    - `canViewReports: isDeveloper || isAdmin`
- In `admin/src/components/AdminSidebar.tsx`:
  - Filter visible tabs based on permission flags:
    - Dashboard: `canAccessDashboard`
    - Orders Queue: `canManageOrders`
    - QR Scanner: `canScanQr && !isPrinter`
    - Inventory: `canManageInventory || canUpdateStockOnly`
    - Menu Dishes: `canManageMenu`
    - Categories: `canManageMenu`
    - Teacher Requests: `canReviewStaff`
    - Developer: `canAccessDeveloper`
- In `admin/src/app/page.tsx`:
  - If user is `staff`, redirect to `/orders`.
  - If user is `retail`, redirect to `/inventory`.
  - If user is `printer`, redirect to `/printer`.
- In `admin/src/app/developer/page.tsx`:
  - Update user management dropdown to offer all 5 admin roles + Customer:
    - `developer`: Developer (Full Access & Debug Tools)
    - `admin`: Admin (Full Operations)
    - `staff`: Staff (Store Worker - Scan, Checkout & Stock)
    - `retail`: Retail (Stock Update Only)
    - `printer`: Printer (Hardware Kiosk - QR & Bill Print)
    - `customer`: Customer (Student / Teacher / Guest)
  - Display `account_type`: `'staff_t'` renders as `Teacher (Staff)`.
- In `admin/src/app/inventory/page.tsx`:
  - If `canUpdateStockOnly` (retail) and not `canManageInventory`, disable or hide "Add Dish / New Stock" action.
- In `admin/src/app/staff-requests/page.tsx`:
  - Update labels to clearly indicate Teacher / Faculty verification requests (`staff_t`).
- In `admin/src/app/printer/page.tsx`:
  - Create the future-ready kiosk terminal page scaffolding: displays live connection status, QR scanner trigger that invokes `/api/v1/admin/orders/collect-qr`, and receipt preview component ready for thermal printer drivers.
- Ensure zero AI things in UI. Zero comments in source code.

- [ ] **Step 1:** Update `admin/src/context/AdminAuthContext.tsx`.
- [ ] **Step 2:** Update `admin/src/components/AdminSidebar.tsx` and `admin/src/components/Header.tsx`.
- [ ] **Step 3:** Update `admin/src/app/developer/page.tsx` and `admin/src/app/staff-requests/page.tsx`.
- [ ] **Step 4:** Build `admin/src/app/printer/page.tsx` scaffolding.
- [ ] **Step 5:** Run `npm --prefix admin run typecheck` and `npm --prefix admin run build`.

---

### Task 6: Customer 3-Tier Account Classification Updates

**Files:**
- Modify: `customer/src/context/AuthContext.tsx`
- Modify: `customer/src/app/signup/page.tsx`
- Modify: `customer/src/app/profile/page.tsx`
- Modify: `customer/src/app/settings/page.tsx`
- Modify: `customer/src/app/checkout/page.tsx`
- Modify: `customer/src/components/WelcomeLanding.tsx`

**Requirements:**
- In `customer/src/context/AuthContext.tsx`:
  - `export type AccountType = 'student' | 'staff_t' | 'guest';`
  - In `signUp`: Accept `accountType: AccountType`.
- In `customer/src/app/signup/page.tsx`:
  - Implement a 3-way toggle in registration:
    1. **Student** (`student`) with `GraduationCap` icon
    2. **Teacher / Faculty** (`staff_t`) with `Briefcase` icon
    3. **Guest** (`guest`) with `Globe` or `UserCheck` icon
  - Only show Teacher ID input when `accountType === 'staff_t'` (Teachers).
  - Hide Teacher ID input when `student` or `guest`.
  - When `guest` is selected, send `accountType: 'guest'`.
- In `customer/src/app/profile/page.tsx` & `customer/src/app/settings/page.tsx`:
  - Display user classification badge: "Student", "Teacher (Faculty)", or "Guest Diner".
- In `customer/src/app/checkout/page.tsx`:
  - Faculty Pay Later option is strictly visible/selectable only if `profile?.account_type === 'staff_t' && profile?.staff_approval_status === 'approved'`.
  - Guests and students are provided standard Razorpay payment.
- Ensure zero AI things in UI. Zero comments in source code.

- [ ] **Step 1:** Update `customer/src/context/AuthContext.tsx`.
- [ ] **Step 2:** Update `customer/src/app/signup/page.tsx` with 3-way selector (`student`, `staff_t`, `guest`).
- [ ] **Step 3:** Update badge displays across `profile/page.tsx`, `settings/page.tsx`, and `checkout/page.tsx`.
- [ ] **Step 4:** Run `npm --prefix customer run typecheck` and `npm --prefix customer run build`.

---

### Task 7: Documentation & Memory Synchronization

**Files:**
- Modify: `docs/authentication.md`
- Modify: `docs/staff-approval.md`
- Modify: `docs/architecture.md`
- Modify: `project_memory.md`
- Modify: `changelogs.md`

**Requirements:**
- Update `docs/authentication.md`: Document the 3 customer account types (`student`, `staff_t`, `guest`) and 5 admin application roles, complete with permission matrix and explicit `staff_t` vs `staff` separation.
- Update `docs/staff-approval.md`: Detail the Teacher (`staff_t`) approval flow and distinguish it from Canteen Store Staff (`staff` in `app_role`).
- Update `docs/architecture.md`: Refine role access tiers and hardware kiosk/printer terminal specifications.
- Update `project_memory.md`: Reflect newly modified files, schemas, and role capabilities.
- Update `changelogs.md`: Add a comprehensive changelog entry under `[Unreleased]`.

- [ ] **Step 1:** Update documentation markdown files.
- [ ] **Step 2:** Update `project_memory.md` and `changelogs.md`.
