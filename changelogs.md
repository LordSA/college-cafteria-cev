# Changelogs — Cafteria Platform

All notable changes to the Cafteria platform are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), adhering to Semantic Versioning.

> **Rule Requirement:** Developers and automated agents **MUST** log every codebase modification, file creation, or schema change in this file under an appropriate section.

---

## [Unreleased]

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
