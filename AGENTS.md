<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Strict Instructions for Developers & AI Agents

This repository is governed by strict rules for automated developer agents (including Antigravity, AGY CLI, Cursor, Windsurf, Claude Code, Aider, and custom subagents) as well as human developers.

---

## 1. Core Operating Principles

1. **Check Documentation First**:
   - Before attempting any repository modification, schema migration, or code execution, the agent **MUST** read [project_memory.md](./project_memory.md) and [design.md](./design.md) to understand current architecture, ports, schemas, configurations, and component behaviors.

2. **Keep Documentation Synced**:
   - Every time a change or edit is made to the codebase, the developer/agent **MUST** update:
     - [project_memory.md](./project_memory.md): Add or revise descriptions of modified files, functions, or schemas.
     - [design.md](./design.md): Update theme properties or layouts if design variables change.
     - [changelogs.md](./changelogs.md): Log all changes with dates and description.
     - [README.md](./README.md): Update setup instructions if dependencies or configs change.

3. **Clean Up Agent Comments**:
   - **CRITICAL**: Before finishing work or committing files, the agent **MUST** remove all temporary notes, comment indicators, block explanations, or explanatory comments added inside source code files (`.ts`, `.tsx`, `.js`, `.css`). Clean code is mandatory.

4. **Remove All Comments After Work**:
   - **CRITICAL**: After completing any task, the agent **MUST** scan all modified source files (`.ts`, `.tsx`, `.js`, `.css`) and remove **every** comment — including file path headers (`// path/to/file`), inline explanatory comments (`// this does X`), JSX block comments (`{/* ... */}`), and CSS comments (`/* ... */`). The only exception is comments required by tooling (e.g., `next-env.d.ts`, ESLint directives). Zero comments in production source code is mandatory.

---

## 2. Architecture & Monorepo Constraints

- **Zero Monorepo Workspaces**: Do not introduce npm, yarn, pnpm workspaces, Turborepo, or Nx. Each directory (`customer`, `admin`, `backend`) maintains independent dependencies and configurations.
- **Strict Decoupling**: Frontends must never implement Next.js API routes (`/api/*`) or backend business logic. All database access, auth verification, and business logic belong exclusively in `backend/`.
- **Static Export Only**: Both Next.js frontends deploy to Cloudflare Pages via static HTML export (`output: 'export'`). Server-rendered React Server Components (dynamic SSR) and edge API routes in Next.js are not supported.
- **Port Allocation**:
  - `customer/`: Port `3000`
  - `admin/`: Port `3001`
  - `backend/`: Port `8787`

---

## 3. Pre-Flight Checklist Before Completing Tasks

Every developer or agent must run through this checklist before marking a task complete:

- [ ] Read `project_memory.md` and `design.md` prior to code modifications.
- [ ] Verified changes compile cleanly via `npm run typecheck` and `npm run build` in affected apps.
- [ ] Scanned all modified source code (`.ts`, `.tsx`, `.js`, `.css`) and deleted all comments.
- [ ] Documented changes in `changelogs.md`.
- [ ] Updated `project_memory.md` with new/modified files, routes, or behaviors.
- [ ] Updated `design.md` if any style, token, or layout changed.
- [ ] Updated `README.md` if dependencies, environment variables, or run commands changed.
