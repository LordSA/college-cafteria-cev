# Architecture & Design Specification: Platform Enhancements & Redesign

- **Date:** 2026-11-15
- **Status:** Approved Draft for Implementation
- **Target Applications:** `customer/`, `admin/`, `backend/`

---

## 1. Executive Summary

This specification outlines the comprehensive visual, architectural, and security overhaul of the Cafteria platform (`college-canteen-cev`). It introduces mandatory authentication route guarding, a glassmorphic theme engine with automatic OS device scheme tracking, a redesigned welcome/landing splash page, modernized mobile-first login and signup experiences, a floating curved bottom navigation bar, enhanced brand identity using newly provided SVG and PNG assets, and the deprecation of the simulated testing wallet across the system.

---

## 2. Requirements & Subsystem Breakdown

### 2.1 Subsystem 1: Mandatory Authentication Gate & Route Protection
1. **Entry Protection**:
   - When an unauthenticated visitor visits the root path (`/`), the application renders the dedicated **Welcome Landing Screen** instead of the dining catalog.
   - Any attempt to access authenticated customer routes (`/menu`, `/cart`, `/checkout`, `/orders`, `/profile`, `/settings`) by an unauthenticated user triggers an immediate redirect to `/` with the return URL preserved in query parameters (`?redirect=...`).
2. **Session Lifecycle**:
   - `AuthProvider` exposes authentication state (`user`, `session`, `loading`).
   - While `loading` is true, an elegant brand loader (using the theme-appropriate icon) is rendered to prevent layout flashing.
   - Once authenticated, accessing `/` displays the full campus dining portal with personalized greetings, active orders, and quick ordering actions.

### 2.2 Subsystem 2: Glassmorphic Dark Mode Theme Engine
1. **Theme Options & Defaults**:
   - Three selectable modes: `'device'`, `'dark'`, `'light'`.
   - Default setting is `'device'`.
   - When set to `'device'`, the app evaluates `window.matchMedia('(prefers-color-scheme: dark)')` and attaches a change listener (`change` event) to seamlessly update between light and dark without page reload.
   - Persistent preference stored in `localStorage` under key `cafeteria_theme_preference`.
2. **DOM Integration & Tailwind**:
   - In `customer/tailwind.config.ts`, `darkMode: 'class'` is enabled.
   - The root `<html>` element dynamically receives or removes the `dark` class based on the resolved active theme (`'dark'` or `'light'`).
3. **Glassmorphic Design Tokens**:
   - **Light Mode**:
     - Surface background: `#fafaf9` / `#f5f5f4`.
     - Glass containers: `bg-white/80 backdrop-blur-xl border border-black/[0.06] shadow-sm text-stone-900`.
     - Input fields: `bg-stone-100/70 border border-stone-200 text-stone-900 placeholder-stone-400`.
   - **Dark Mode**:
     - Surface background: `#0d0e12` / `#121316`.
     - Glass containers: `bg-[#161820]/80 backdrop-blur-xl border border-white/10 shadow-2xl text-stone-100`.
     - Input fields: `bg-white/[0.05] border border-white/10 text-white placeholder-stone-500`.
   - **Accent Colors**:
     - Primary brand orange: `#FC6200` / `#FF5E3A` preserved uniformly across light and dark modes to maintain strong brand recognition.
4. **Theme Switcher in Settings**:
   - In `customer/src/app/settings/page.tsx`, a 3-segment glass segmented control is placed under an "Appearance & Theme" section:
     - `Device` (Smartphone/Monitor icon)
     - `Dark` (Moon icon)
     - `Light` (Sun icon)
   - Visual active pill highlight indicates the current active selection.

### 2.3 Subsystem 3: Welcome Landing Splash Screen (Screenshot 1 Reference)
1. **Visual Structure**:
   - Rendered for unauthenticated visitors on `/`.
   - Background food photography with gradient overlay fading to solid theme background.
   - Headline: **Welcome to Cafeteria CEV** in bold sans-serif typography.
   - Subtitle: *Order ahead, skip the queue, and pick up hot meals at Counter #1.*
   - Primary Action Button: Large pill button with black background (or dark glass in dark mode) titled **Start with email**, linking to `/signup` or `/login`.
   - Divider: Clean horizontal rule with centered caption `Sign in with`.
   - Social Action Button: Full-width rounded white pill with Google G icon titled **Continue with Google** (triggering Supabase OAuth). No Facebook button.
   - Footer Prompt: Centered text `Already have an account? Sign In` with orange interactive link to `/login`.

### 2.4 Subsystem 4: Login & Sign-Up UI Redesign (Screenshot 2 Reference)
1. **Form Layout & Aesthetics**:
   - Minimalist, high-contrast mobile-first card centered in the viewport.
   - Page Header: Bold **Login** (or **Sign Up**).
   - Form Fields:
     - `Email`: Clear label, rounded pill input, placeholder `Your email`.
     - `Password`: Clear label, rounded pill input, placeholder `Password`, and right-aligned interactive show/hide password toggle (Eye / EyeOff icon).
     - Right-aligned orange link for `Forgot password?` pointing to `/forgot-password`.
   - Primary CTA: Full-width vibrant orange rounded pill button (`#FC6200`) titled **Login** (or **Create Account**).
   - Switch Action: Centered text `Don't have an account? Sign Up` (or `Already have an account? Sign In`).
   - Social Auth: `─── Sign in with ───` followed by `Continue with Google` pill button.
   - For `/signup`: Includes conditional Teacher ID capture when staff role is selected, maintaining campus account classification logic.

### 2.5 Subsystem 5: Curved Bottom Navigation Bar
1. **Mobile Bottom Navigation Dock (`MobileBottomNav.tsx`)**:
   - Geometry: Floating curved glass dock (`mx-4 mb-3 rounded-[28px] border border-black/5 dark:border-white/10 backdrop-blur-xl bg-white/85 dark:bg-[#121316]/85 shadow-2xl safe-area-bottom`).
   - Navigation Items: 4 primary destinations:
     1. `Home` (`/`)
     2. `Menu` (`/menu`)
     3. `Cart` (`/cart`, with live cart badge counter)
     4. `Profile` (`/profile`)
   - Active Highlight: Warm orange active pill with scale transition (`active:scale-95`).

### 2.6 Subsystem 6: Brand Identity, Logos & Icons
1. **Brand Title in PC Navbar & Footer**:
   - Replaces text `Cafteria.cev` in `customer/src/components/Navbar.tsx` and `Footer.tsx` with `<img src="/logo title.svg" alt="Cafeteria CEV" />`.
   - Uses styling to ensure crisp contrast on light and dark header bars.
2. **Theme-Aware App Icons**:
   - Light Theme Icon: `/icons/cafe ico 1.png` (Orange/black bowl icon matching the 3rd uploaded image).
   - Dark Theme Icon: `/icons/cafe ico 2.png` (White bowl icon matching the 4th uploaded image).
   - Dynamically loaded in `Navbar.tsx`, mobile headers, and dynamic favicon link in HTML head.
3. **SVG Logo Family**:
   - `logo_clr.svg`: Utilized on light theme cards, welcome splash details, and receipts.
   - `logo_white.svg`: Utilized on dark theme glass surfaces, dark hero headers, and dark cards.
   - `logo_bl.svg`: Utilized on high-contrast print receipts (`@media print`).
4. **Promotional Banner**:
   - `banner.png` (matching the 5th uploaded image) integrated on the home page as a clickable hero banner linking to `/menu`.

### 2.7 Subsystem 7: Complete Deprecation & Removal of Testing Wallet
1. **Customer App Cleanup**:
   - Delete `customer/src/app/wallet/page.tsx`.
   - Remove wallet button and wallet balance fetch from `Navbar.tsx` and `SidebarDrawer.tsx`.
   - In `checkout/page.tsx`, remove testing wallet payment method; preserve Razorpay (UPI, Cards, Netbanking) and Faculty Pay Later.
   - Update `payment-faq/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, and `profile/page.tsx` to remove references to testing wallet.
2. **Backend & Admin Cleanup**:
   - In `backend/src/routes/api.ts`, remove `/wallet` route mount.
   - In `backend/src/routes/orders.ts`, ensure order checkout validates payment mode exclusively for `razorpay` and `pay_later`.
   - In `admin/src/components/AdminSidebar.tsx`, remove "Wallets & Credit" navigation item.

### 2.8 Subsystem 8: Strict No Refund & No Cancellation Policy
1. **Business Rule**:
   - Because all canteen food items are prepared fresh on-demand immediately upon order placement, **orders cannot be cancelled and payments are strictly non-refundable**.
2. **UI & Legal Integration**:
   - **Checkout Page (`checkout/page.tsx`)**: High-contrast disclosure badge above the "Pay & Place Order" button stating: *"Notice: All orders are freshly prepared upon receipt. Orders cannot be cancelled and are non-refundable once placed."*
   - **Payment FAQs (`payment-faq/page.tsx`)**: Dedicated top FAQ accordion item titled *"What is the Refund & Cancellation Policy?"* with detailed explanation.
   - **Terms & Conditions (`terms/page.tsx`)**: Prominent Section on *"Strict No-Refund & No-Cancellation Policy"*.
   - **Order Receipt & Tracking (`orders/receipt/page.tsx`, `orders/track/page.tsx`)**: Receipt footnote: *"Notice: Takeaway order. Non-refundable & non-cancellable once prepared."*

---

## 3. Data & State Management Flow

```
[ Visitor Enters Site ]
          │
          ▼
   [ Auth Loading? ] ──Yes──► [ Brand Loader with Theme Icon ]
          │ No
          ▼
   [ User Authenticated? ]
     ├─► No  ──► Render [ Welcome Splash Page (Screenshot 1) ]
     │            ├── "Start with email" ──► /login or /signup (Screenshot 2)
     │            └── "Continue with Google" ──► Supabase OAuth
     │
     └─► Yes ──► Render [ Campus Dining Portal (Theme-Aware) ]
                  ├── ThemeContext resolves 'device' | 'dark' | 'light'
                  ├── Floating Curved Bottom Dock (Mobile)
                  ├── PC Navbar with /logo title.svg and Theme Icon
                  └── Banner Card ──► /menu
```

---

## 4. Verification & Testing Strategy

1. **Static Analysis & Compilation**:
   - `npm --prefix customer run typecheck` must pass with 0 errors.
   - `npm --prefix admin run typecheck` must pass with 0 errors.
   - `npm --prefix backend run typecheck` must pass with 0 errors.
2. **Backend Automated Tests**:
   - `npm --prefix backend test` (Vitest) must pass all test suites.
3. **Responsive & Theme Verification**:
   - Light mode verified with `cafe ico 1.png` and `logo_clr.svg`.
   - Dark mode verified with `cafe ico 2.png` and `logo_white.svg`.
   - OS preference changes verified using `window.matchMedia`.
4. **Codebase Hygiene**:
   - Strict compliance with `AGENTS.md`: 0 comments across all modified source code (`.ts`, `.tsx`, `.js`, `.css`).
