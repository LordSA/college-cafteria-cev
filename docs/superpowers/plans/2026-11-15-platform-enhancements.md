# Platform Enhancements & Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement mandatory authentication route guarding, glassmorphic dark mode theme engine with automatic device preference detection, welcome splash landing page, modern mobile-first login and signup forms, floating curved bottom navigation bar, updated brand title/icons/banner, strict no-refund policy disclosures, and complete removal of the testing wallet subsystem.

**Architecture:** Client-side theme provider (`ThemeContext`) managing `'device' | 'dark' | 'light'` with media query listeners, route-guarded root and secondary page wrappers, glassmorphic Tailwind styling, dynamic theme icon loading, and clean deprecation of simulated wallet endpoints.

**Tech Stack:** Next.js 16.4.3 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Supabase Auth, Hono (Cloudflare Workers).

**Spec:** `docs/superpowers/specs/2026-11-15-platform-enhancements-design.md`

## Global Constraints
- **Zero Monorepo Workspaces**: Maintain independent dependency trees in `customer/`, `admin/`, `backend/`.
- **Zero Comments Rule (`AGENTS.md`)**: No comments (`//`, `/*`, `{/* */}`) in production source code (`.ts`, `.tsx`, `.js`, `.css`).
- **Static Export**: Both Next.js frontends deploy via `output: 'export'`.
- **Theme Default**: Device theme (`device`) by default, reflecting system dark/light mode preference automatically.

## Review Focus
1. Unauthenticated users visiting any customer route must land on or be redirected to the Welcome Splash page without exposing food order controls.
2. Device theme switching must immediately respond to system dark/light preference changes when set to `device`.
3. Login and Signup forms must maintain Google OAuth and Student/Staff Teacher ID flows without regression.
4. Floating curved bottom navigation bar must clear viewport edges and preserve safe-area-inset on mobile.
5. All references to testing wallet must be cleanly eliminated from customer navigation, checkout, and documentation without breaking Razorpay or Faculty Pay Later.

---

### Task 1: Theme Engine & Glassmorphism Foundation

**Files:**
- Create: `customer/src/context/ThemeContext.tsx`
- Modify: `customer/tailwind.config.ts`
- Modify: `customer/src/app/globals.css`
- Modify: `customer/src/app/layout.tsx`

**Interfaces:**
- Produces: `useTheme(): { themeMode: 'device' | 'dark' | 'light', activeTheme: 'dark' | 'light', setThemeMode: (mode: 'device' | 'dark' | 'light') => void }`

- [ ] **Step 1: Configure Tailwind for Class-Based Dark Mode**
  In `customer/tailwind.config.ts`, add `darkMode: 'class'`.

- [ ] **Step 2: Add Glassmorphism & Safe-Area Utility Classes**
  In `customer/src/app/globals.css`, add utilities for dark/light glass backgrounds and safe-area padding.

- [ ] **Step 3: Implement `ThemeContext.tsx`**
  Implement theme state reading from `localStorage.getItem('cafeteria_theme_preference') || 'device'`. Attach `window.matchMedia('(prefers-color-scheme: dark)')` listener when mode is `'device'`. Synchronize the `.dark` class onto `document.documentElement`.

- [ ] **Step 4: Mount `ThemeProvider` in `customer/src/app/layout.tsx`**
  Wrap child tree with `<ThemeProvider>`.

- [ ] **Step 5: Verify Typecheck**
  Run: `npm --prefix customer run typecheck`
  Expected: PASS with 0 errors.

---

### Task 2: Settings Theme Switcher UI

**Files:**
- Modify: `customer/src/app/settings/page.tsx`

**Interfaces:**
- Consumes: `useTheme()` from `customer/src/context/ThemeContext.tsx`

- [ ] **Step 1: Add Appearance Section in Settings**
  In `customer/src/app/settings/page.tsx`, import `useTheme` and add an "Appearance & Theme" glass card.

- [ ] **Step 2: Render 3-Way Segmented Switcher**
  Render 3 interactive options: `Device`, `Dark`, `Light` with respective icons (`Smartphone`, `Moon`, `Sun`). Highlight the active selection with warm orange pill background.

- [ ] **Step 3: Verify Typecheck**
  Run: `npm --prefix customer run typecheck`
  Expected: PASS with 0 errors.

---

### Task 3: Auth Gate & Welcome Landing Splash Page

**Files:**
- Create: `customer/src/components/WelcomeLanding.tsx`
- Modify: `customer/src/app/page.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `customer/src/context/AuthContext.tsx`
- Produces: `<WelcomeLanding />` component based on Screenshot 1

- [ ] **Step 1: Build `WelcomeLanding.tsx`**
  Implement the landing screen matching Screenshot 1:
  - Hero food visual with glassmorphic dark-to-vibrant gradient overlay.
  - Headline: "Welcome to Cafeteria CEV".
  - Subtitle: "Order ahead, skip the queue, pick up hot meals at Counter #1".
  - Primary button: "Start with email" (links to `/signup`).
  - Divider: `─── Sign in with ───`.
  - Google button: "Continue with Google" calling `signInWithGoogle()`.
  - Footer: "Already have an account? Sign In" (links to `/login`).

- [ ] **Step 2: Gate `customer/src/app/page.tsx`**
  If `!user && !loading`, render `<WelcomeLanding />`. If `user`, render the full campus dining portal.

- [ ] **Step 3: Verify Typecheck**
  Run: `npm --prefix customer run typecheck`
  Expected: PASS with 0 errors.

---

### Task 4: Login & Sign-Up UI Redesign

**Files:**
- Modify: `customer/src/app/login/page.tsx`
- Modify: `customer/src/app/signup/page.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `signIn()`, `signUp()`, `signInWithGoogle()`

- [ ] **Step 1: Redesign `customer/src/app/login/page.tsx` (Screenshot 2 Reference)**
  Implement minimalist card:
  - Title: "Login".
  - Clean input fields for Email and Password with eye show/hide password toggle.
  - Right-aligned "Forgot password?" link.
  - Large orange rounded CTA button: "Login".
  - Switch text: "Don't have an account? Sign Up".
  - Divider: `─── Sign in with ───` followed by "Continue with Google" button.

- [ ] **Step 2: Redesign `customer/src/app/signup/page.tsx`**
  Apply the matching visual design language to `/signup`, preserving student/staff role selection and conditional Teacher ID input.

- [ ] **Step 3: Verify Typecheck**
  Run: `npm --prefix customer run typecheck`
  Expected: PASS with 0 errors.

---

### Task 5: Floating Curved Bottom Navigation Bar

**Files:**
- Modify: `customer/src/components/MobileBottomNav.tsx`

**Interfaces:**
- Consumes: `useTheme()`, `useCart()`

- [ ] **Step 1: Implement Curved Glassmorphic Geometry**
  In `customer/src/components/MobileBottomNav.tsx`, update the navigation container to a floating curved dock (`mx-4 mb-3 rounded-[28px] border border-black/5 dark:border-white/10 backdrop-blur-xl bg-white/85 dark:bg-[#121316]/85 shadow-2xl safe-area-bottom`).

- [ ] **Step 2: Style Navigation Tabs & Badge**
  Style Home, Menu, Cart, and Profile tabs with active scale transitions, warm orange highlights, and live cart count pill.

- [ ] **Step 3: Verify Typecheck**
  Run: `npm --prefix customer run typecheck`
  Expected: PASS with 0 errors.

---

### Task 6: Brand Title, Theme Icons & Promotional Banner

**Files:**
- Modify: `customer/src/components/Navbar.tsx`
- Modify: `customer/src/components/Footer.tsx`
- Modify: `customer/src/app/page.tsx`

**Interfaces:**
- Consumes: `useTheme()`, `logo title.svg`, `cafe ico 1.png`, `cafe ico 2.png`, `banner.png`

- [ ] **Step 1: Update Brand Title in PC Navbar & Footer**
  In `customer/src/components/Navbar.tsx` and `Footer.tsx`, replace text with `<img src="/logo title.svg" alt="Cafeteria CEV" className="h-7 w-auto object-contain" />`.

- [ ] **Step 2: Add Theme-Aware App Icon**
  In `Navbar.tsx` and header elements, dynamically render:
  `activeTheme === 'dark' ? '/icons/cafe ico 2.png' : '/icons/cafe ico 1.png'`.

- [ ] **Step 3: Integrate Promotional Banner on Home Page**
  In `customer/src/app/page.tsx`, insert a promotional hero banner using `/banner.png` linking to `/menu`.

- [ ] **Step 4: Verify Typecheck**
  Run: `npm --prefix customer run typecheck`
  Expected: PASS with 0 errors.

---

### Task 7: Strict No-Refund & No-Cancellation Policy

**Files:**
- Modify: `customer/src/app/checkout/page.tsx`
- Modify: `customer/src/app/payment-faq/page.tsx`
- Modify: `customer/src/app/terms/page.tsx`
- Modify: `customer/src/app/orders/receipt/page.tsx`
- Modify: `customer/src/app/orders/track/page.tsx`

- [ ] **Step 1: Add Non-Refundable Disclosure on Checkout**
  In `checkout/page.tsx`, place a prominent alert badge above the payment button: "Notice: All orders are freshly prepared upon receipt. Orders cannot be cancelled and are strictly non-refundable once placed."

- [ ] **Step 2: Update Payment FAQs & Terms**
  Add explicit No-Refund & No-Cancellation section in `payment-faq/page.tsx` and `terms/page.tsx`.

- [ ] **Step 3: Add Policy Footnote on Receipts & Tracking**
  Add policy notice on order tracking and bill receipt pages.

- [ ] **Step 4: Verify Typecheck**
  Run: `npm --prefix customer run typecheck`
  Expected: PASS with 0 errors.

---

### Task 8: Complete Removal of Testing Wallet

**Files:**
- Delete: `customer/src/app/wallet/page.tsx`
- Modify: `customer/src/components/Navbar.tsx`
- Modify: `customer/src/components/SidebarDrawer.tsx`
- Modify: `customer/src/app/checkout/page.tsx`
- Modify: `customer/src/app/profile/page.tsx`
- Modify: `customer/src/app/payment-faq/page.tsx`
- Modify: `customer/src/app/terms/page.tsx`
- Modify: `customer/src/app/privacy/page.tsx`
- Modify: `customer/src/components/Footer.tsx`
- Modify: `admin/src/components/AdminSidebar.tsx`
- Modify: `backend/src/routes/api.ts`
- Modify: `backend/src/routes/orders.ts`

- [ ] **Step 1: Remove Wallet UI from Customer**
  Delete `customer/src/app/wallet/page.tsx`. Remove wallet icon and balance fetching in `Navbar.tsx` and `SidebarDrawer.tsx`. Remove testing wallet payment option from `checkout/page.tsx`. Remove wallet references in profile, FAQs, terms, privacy, and footer.

- [ ] **Step 2: Remove Wallet Route Mount from Backend**
  In `backend/src/routes/api.ts`, remove `api.route('/wallet', walletRoutes)`. In `backend/src/routes/orders.ts`, ensure payment mode validates only `razorpay` and `pay_later`.

- [ ] **Step 3: Remove Wallets Link from Admin Sidebar**
  In `admin/src/components/AdminSidebar.tsx`, remove the "Wallets & Credit" link from `navLinks`.

- [ ] **Step 4: Run Backend Tests**
  Run: `npm --prefix backend test`
  Expected: All tests pass.

---

### Task 9: Verification, Comment Scan & Documentation Sync

**Files:**
- Modify: `changelogs.md`
- Modify: `project_memory.md`
- Modify: `design.md`
- Modify: `README.md`

- [ ] **Step 1: Run Full TypeScript Typecheck Across All 3 Projects**
  Run:
  - `npm --prefix customer run typecheck`
  - `npm --prefix admin run typecheck`
  - `npm --prefix backend run typecheck`
  Expected: 0 errors across all three.

- [ ] **Step 2: Zero Comments Enforcement Scan**
  Scan all modified `.ts`, `.tsx`, `.js`, `.css` files for comments (`//`, `/*`, `{/* */}`). Remove any comments found per `AGENTS.md`.

- [ ] **Step 3: Update System Documentation**
  Log all additions, deprecations, and style updates in `changelogs.md`, `project_memory.md`, `design.md`, and `README.md`.
