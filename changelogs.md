# Changelogs — Cafteria Platform

All notable changes to the Cafteria platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to Semantic Versioning.

> **Rule Requirement:** Developers and automated agents **MUST** log every codebase modification, file creation, or schema change in this file under an appropriate section.

---

## [Unreleased]

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
