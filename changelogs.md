# Changelogs — Cafteria Platform

All notable changes to the Cafteria platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to Semantic Versioning.

> **Rule Requirement:** Developers and automated agents **MUST** log every codebase modification, file creation, or schema change in this file under an appropriate section.

---

## [Unreleased]

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

### Added
- Created comprehensive documentation and design system specifications:
  - `AGENTS.md`: Mandatory instructions, Next.js breaking changes warnings, and zero-comment source code rule.
  - `.agents/rules/agent-rules.md`: Antigravity workspace customization rule for agent governance.
  - `docs/agent_rules.md`: Documentation mirror for developer & agent rules.
  - `project_memory.md`: Persistent memory of application topology, files, ports, contracts, and roadmap.
  - `design.md`: Unified design manifesto linking customer and admin design systems.
  - `docs/design_customer.md`: Complete customer mobile-first design system (warm amber palette, dietary badges, cart flow, touch targets).
  - `docs/design_admin.md`: Kitchen Display System (KDS) & admin dashboard design system (dark slate palette, WCAG AAA tickets, tabular figures).
  - `docs/api.md`: Hono REST API specification for Cloudflare Workers (CORS, health, logging sanitization, error envelopes).
  - `changelogs.md`: Repository changelog tracking all changes.

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
