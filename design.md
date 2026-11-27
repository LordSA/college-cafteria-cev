# Cafteria Design System Manifesto

> **Scope:** Unified design philosophy and 100% theme parity across Customer and Admin frontends.  
> **Rule Requirement:** Developers and automated agents **MUST** update this document or the dedicated subsystem specifications when theme tokens, color palettes, or layout principles change.

---

## 1. Unified Design Philosophy

Cafteria provides a harmonious, appetizing, and ultra-crisp campus dining experience across both the customer mobile ordering app and the staff kitchen management dashboard:

1. **The Customer Experience (`customer/`):** Fast, appetizing, warm, and optimized for one-handed mobile ordering between lectures.
2. **The Operations & Kitchen Experience (`admin/`):** Clean, high-contrast, expansive pure-white canvas (`#FFFFFF`) with brand warm orange accents (`#F47721`), soft peach card highlights (`#FFF7F0`), and instant touch-first operational controls.

| Dimension | Customer Application | Admin & Kitchen Operations |
|---|---|---|
| **Primary Theme** | Warm Orange (`#F47721`) & Clean Canvas | Warm Orange (`#F47721`) & Pure White Canvas (`#FFFFFF`) |
| **Primary Goal** | Minimize time to order & reduce queue stress | Maximize order throughput, inventory tracking & dispatch |
| **Primary Target** | Mobile smartphones (360px–430px) | Tablets, kitchen dispatch displays (KDS), desktop browsers |
| **Target Contrast** | WCAG AA / AAA | WCAG AAA (>= 7:1) |
| **Touch Targets** | 44px–48px | 44px–56px |
| **Attribution** | Designed and Developed by IEDC CEV | Designed and Developed by IEDC CEV |

---

## 2. Shared Foundations

### 2.1 Typography
Both applications leverage clean system sans-serif typography (`Inter`):
- High legibility at small sizes.
- Monospace numerals (`tabular-nums font-mono`) utilized for currency (`₹`), token identifiers (`#B-108`), order timers, and countdowns.

### 2.2 Iconography
Exclusively powered by `lucide-react` across both applications:
- Stroke width: `2px` (standard) or `1.5px` for dense admin tables.
- Standard sizes: `14px` (`h-3.5 w-3.5`) for badges, `16px`–`20px` for button actions, `24px` for headers.

### 2.3 Micro-Animations & Responsiveness
- Transitions are snappy: `duration-150 ease-out`.
- No sluggish or heavy layout shifts.
- All interactive elements must provide immediate active press feedback (`active:scale-95`).

---

## 3. Subsystem References

- **Unified Warm Canteen Theme & College Shop UI:**
  - **Color Palette & Accents:** Warm coral, rose, and amber gradients (`from-[#ff5e3a] via-[#ff7043] to-[#ffa040]` and `from-[#ff4b4b] to-[#ff7844]`), crisp white cards with soft warm drop shadows, and neutral stone text tokens (`stone-900`, `stone-600`, `stone-400`).
  - **Dark Mode & Glassmorphic Engine:** Tailwind `class` dark mode with obsidian glass surfaces (`#0b0c0e` base, `#121316` surface, `#1a1b24` elevated, border `#22242e`, `.glass-surface` with `backdrop-blur-xl`).
  - **Dynamic Theme Icons & Logos:** Desktop Navbar and Footer utilize `logo title.svg`. Theme icon dynamically renders `cafe ico 1.png` on light surfaces and `cafe ico 2.png` on dark surfaces.
  - **Mobile Shell (`md:hidden`):**
    - Curved Warm Header: `from-[#ff5e3a] via-[#ff7043] to-[#ffa040]` with `rounded-b-[2.5rem]`, high-contrast white greeting typography, and CEV College Canteen Counter #1 identity.
    - Floating Search Pill: Clean white rounded pill container with orange search icon and filter control.
    - Circular Category Rail: Circular icon buttons (Meals, Coffee, Gifts, Juice, Cake, Pizza, Fruits) with active coral gradient pill highlight.
    - Hot Products Carousel: Horizontal card scroll for top campus favorites ("Most Ordered & Clicked") with star ratings (`★ 4.8`), order volume (`12K+ orders`), prep times (`⏱ 4-12 Min`), and instant Add-to-cart buttons.
    - Exclusive Deals: Vibrant tri-color gradient circular offer badges.
    - Floating Curved Mobile Bottom Dock (`rounded-[28px]`): Fixed 4-tab floating glass dock (`Home`, `Menu`, `Cart`, `Profile`) with active orange pill highlight, safe-area-bottom padding, and live cart badge counter.
    - Floating Cart Checkout Bar (`.floating-cart-bottom`): Responsive floating action card pinned at `calc(6rem + max(0.75rem, env(safe-area-inset-bottom, 0px)))` on mobile viewports to guarantee an exact, collision-free 16px clearance above the mobile bottom dock on all viewport heights and iOS devices, with desktop fallback to `md:bottom-6`. Scroll padding expanded to `pb-44`.
  - **PC Desktop Layout (`hidden md:block`):**
    - Clean Unified Navbar (`Navbar.tsx`): Header across all desktop pages with `logo title.svg`, dynamic theme icon, primary navigation links (`Home`, `Menu`), Cart button with item count badge, and User Profile with preset avatar / Login button.
  - **Menu & Cart Column Layout:**
    - Single-column vertical list system for fast scrolling and thumb reach.
    - Category Filter dialog button with active filter dismissal tags.
    - 5-minute atomic reservation timer banner with automatic eviction of expired locked items.
  - **Post-Payment, Receipts & Pickup:**
    - High-contrast SVG QR collection pass displayed prominently at the TOP.
    - Itemized ordered dishes breakdown and paid total displayed directly BELOW the QR code.
    - Strict No-Refund & No-Cancellation Policy disclosed prominently across checkout, order tracking, and printable receipts.
  - **Profile & Settings Experience:**
    - 5 local preset avatars (`/avatars/avatar-X.svg`) replacing file uploads.
    - User classification role prominently displayed beneath name.
    - 3-Way Appearance Switcher (`Device`, `Dark`, `Light`) defaulting to `Device` with live OS media query tracking.
    - Modal popup card for password changes.
    - Prominent red Sign Out button positioned at the bottom.
  - **Upgraded Campus Footer (`hidden md:block`):**
    - Visible on desktop and tablet views with `logo title.svg`, operating hours (8:00 AM – 7:00 PM), collection desk details, No-Refund Policy notice, and links to Privacy Policy (`/privacy`), Terms & Conditions (`/terms`), and Payment FAQs (`/payment-faq`).

For full color scales, component anatomy, layout grids, and interactive states:

- **Customer Design System Specification:** [docs/design_customer.md](docs/design_customer.md)
  - Color Tokens (`brand-50` to `brand-900`)
  - Veg / Non-Veg dietary badges
  - Menu cards & slot filters
  - Sticky bottom cart bar & checkout drawers
  - Order token cards

- **Admin & KDS Design System Specification:** [docs/design_admin.md](docs/design_admin.md)
  - Neo-Dark Obsidian Canvas (`#101114`) with elevated surfaces (`#17181f`) and subtle borders (`#22242e`)
  - Dual-Mode Responsive Navigation:
    - Desktop (`md:` and above): 80px left-side vertical rail (`hidden md:flex md:w-20`) with Cafeteria.cev branding, role-gated vertical icon list, active `#f5a4c6` pink pill highlight, and bottom sign out.
    - Mobile (`< md`): Fixed docked bottom bar (`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#121316]/95 backdrop-blur-md border-t border-[#1e1f25]`) with icon + 1-word label, active highlight, safe area spacing, and smooth horizontal scrolling (`.no-scrollbar`).
  - Pastel Rose Active Pills (`#f5a4c6`), Purple Accents (`#9d8bf0`), and Amber Warnings (`#ea9955`)
  - High-density rounded table containers with neon portion alerts and 1-click availability ("86") toggles
  - Order State Machine badges (Order Placed, Ready to Pick, Collected, Pay Later Due)
  - Kitchen Display System (KDS) and high-contrast POS thermal receipt printing specs (`@media print`)
  - Audio and visual alarm states

---

## 4. Subsystem Design Guidelines

### 4.1 Testing Wallet & Demo Credit Notices [DEPRECATED & PURGED IN PHASE 5]
> **Deprecation Notice:** The testing wallet subsystem was permanently retired and purged from the database and frontends in Phase 5 via migrations `0011_remove_wallet.sql` / `20261124000002_remove_wallet.sql`. It is superseded by **Razorpay Standard Checkout** (for students and general diners) and **Faculty Pay Later** (for verified teachers).
- Historical context: Amber/Yellow badges (`bg-amber-500/10 text-amber-500`) and `"Testing Wallet — Demo Credits Only. No Real Money"` disclaimer notices previously identified simulated credits.

### 4.2 High-Contrast QR Code Pass & Verification
- **Token Format:** Cryptographically generated token format `#CAF-QR-XXXXXX`, displayed in bold monospace font (`font-mono text-lg font-bold`).
- **QR SVG Rendering:** Pure SVG client rendering (`qrcode` library) with dark module contrast (`#0f172a` or `#000000`) on high-contrast white card container with rounded corners and `p-4` padding, optimized for handheld optical camera recognition.
- **Scanner Viewfinder:** Responsive video viewport with optical scan guide overlay and instant manual token input fallback.
- **Service Day Cutoff:** Enforces a 10:00 PM IST (UTC+05:30) daily service cutoff, after which uncollected orders display expired badges and reject verification.

### 4.3 Printable Receipts (`@media print`)
- **Monochrome & High Contrast:** Pure black-on-white typography (`#000000` text on `#ffffff` background) designed for standard 80mm POS thermal printers or office inkjet/laser printers.
- **CSS Print Media Queries:** Strict `@media print` rules hiding headers, footers, breadcrumbs, action buttons, and navigation elements (`.no-print { display: none !important; }`), ensuring crisp zero-margin page output (`@page { margin: 8mm; }`).

### 4.4 Canonical Order Lifecycles & Collection UX
- **Canonical Stages:**
  - `ORDER_PLACED`: Amber status badge (`bg-amber-100 text-amber-800`), active waiting state.
  - `COLLECTED`: Neutral slate badge (`bg-stone-100 text-stone-700`), permanently fulfilled and expired QR state.
- **Scanner Pre-flight Safety UX:**
  - Scanning a QR code displays full customer details and order item checklist without mutating state.
  - If scanned in `ORDER_PLACED`, displays active order checklist with 1-click `"Dispatch Meal (Mark as Collected)"` action.
  - If scanned in `COLLECTED`, displays a permanent notice: `"Order already collected"` with collection timestamp and action buttons disabled.
- **Customer QR Invalidation:**
  - When in `COLLECTED` stage, customer tracking and receipt pages replace the scannable SVG QR code with an `"Order Already Collected"` badge to prevent confusion or double pickup attempts.
- **Zero Cancellation Policy:**
  - Strict No-Refund & No-Cancellation notice displayed prominently on checkout, order tracking, and receipt screens. Customer and admin cancellation paths have been eliminated.

### 4.5 Obsidian Admin Dashboard & Faculty Pay Later
- **Obsidian Dark Surface Tokens:** Deep black base (`#0d0e12`), dark card surfaces (`#16171d`), high border radius (`rounded-3xl`), and ultra-subtle borders (`border-white/[0.04]`).
- **Slim Icon Sidebar:** Minimal vertical rail (`w-20 lg:w-24`) with warm orange pill badge (`#F47721`) for active destination.
- **Velocity Wave Chart:** Dynamic SVG spline area chart with timeframe switcher (`Daily`, `Weekly`, `Monthly`).
- **Faculty Pay Later Benefit:**
  - Reserved exclusively for verified faculty and staff accounts (`account_type = 'staff_t'`).
  - Generates instant scannable QR ticket while setting `payment_status = 'unpaid'` and `payment_method = 'pay_later'`.
  - Surfaces current outstanding balance in customer checkout and profile.
  - Real-time Pay Later settlement logging and dues indicator on dashboard.

### 4.6 Phase 5 Design Upgrades: Razorpay Checkout, 5-Tier Roles, Settings & Developer Console
- **Razorpay Standard Checkout:** Responsive popup modal integration via Razorpay SDK with INR integer paise calculations. Seamless error recovery and instant verification redirect.
- **Instagram-Style Circular Profile Photo:** Circular avatar layout with bottom-right camera overlay badge, file picker (JPEG/PNG/WebP), crop/preview modal, presigned direct S3/R2 upload.
- **Customer Settings Page (`/settings`):** Clean stone-900 typography, light card layout with Back button, Account Security (Password change, Google Link/Unlink, Sign out), and Account Information (Email, Role).
- **Admin 5-Tier Role Badges:** Color-coded role pills:
  - Developer: Purple/Indigo pill (`bg-purple-500/15 border-purple-500/30 text-purple-300`)
  - Admin: Rose/Pink pill (`bg-pink-500/15 border-pink-500/30 text-pink-300`)
  - Retail: Amber pill (`bg-amber-500/15 border-amber-500/30 text-amber-300`)
  - Staff: Emerald pill (`bg-emerald-500/15 border-emerald-500/30 text-emerald-300`)
  - Printer: Cyan/Blue pill (`bg-cyan-500/15 border-cyan-500/30 text-cyan-300`)
- **Developer Console (`/developer`):** Obsidian dark system telemetry cards, user role assignment dropdowns, SMTP mailer verification tester, and diagnostic metrics.
- **Excel Report Export UI:** Quick-action `.xlsx` download button with loading spinner positioned alongside financial velocity chart filters.

### 4.7 Support Ticket System UI (Phase 5.1)
- **Customer Inquiry Desk (`customer/src/app/support/page.tsx`):**
  - Category pill selector (`general`, `order_issue`, `payment`, `food_quality`, `feedback`, `suggestion`, `other`).
  - Priority indicators (`low`, `medium`, `high`, `urgent`).
  - Auto-generated alphanumeric ticket tracking identifiers (`TICK-YYYYMMDD-XXXX`).
  - Ticket history drawer with real-time status pill badges (`open`, `in_progress`, `resolved`, `closed`).
- **Admin Support Desk (`admin/src/app/support/page.tsx`):**
  - High-density support queue table with category filter tabs and search.
  - Interactive status changer (`open` -> `in_progress` -> `resolved` -> `closed`).
  - Inline response modal dispatching transactional notification emails to the student or faculty member via the raw socket SMTP mailer.

---

## 5. Subsystem Behavioral Guides

- [docs/order-lifecycle.md](docs/order-lifecycle.md): Strict 3-stage order lifecycle (`ORDER_PLACED` -> `READY_TO_PICK` -> `COLLECTED`), QR invalidation, atomic collection, and 5-step verification guide.
- [docs/orders.md](docs/orders.md): Order status progression, token format (`#CAF-YYMMDD-XXXX`), and concurrency locking.
- [docs/inventory.md](docs/inventory.md): Stock tracking, threshold warning states, and cancellation restoration rules.
- [docs/cart-and-checkout.md](docs/cart-and-checkout.md): Shopping cart persistence, review flow, and unpaid development state.
- [docs/testing-wallet.md](docs/testing-wallet.md): Non-monetary testing wallet, integer paise, auditable transaction ledger, and admin adjustments.
- [docs/qr-verification.md](docs/qr-verification.md): QR verification tokens, camera scanner, counter collection state transitions, and printable receipts.
