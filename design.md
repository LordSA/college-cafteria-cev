# Cafteria Design System Manifesto

> **Scope:** Unified design philosophy and dual design system for Customer and Admin frontends.  
> **Rule Requirement:** Developers and automated agents **MUST** update this document or the dedicated subsystem specifications when theme tokens, color palettes, or layout principles change.

---

## 1. Unified Design Philosophy

Cafteria serves two fundamentally different users with tailored design languages sharing a common ethos of speed, legibility, and zero visual clutter:

1. **The Customer Experience (`customer/`):** Fast, appetizing, warm, and optimized for one-handed mobile ordering between lectures.
2. **The Operations & Kitchen Experience (`admin/`):** Mission-critical, high-contrast, data-dense, dark command center designed for rapid kitchen execution and tablet cashiers.

| Dimension | Customer Application | Admin & Kitchen Operations |
|---|---|---|
| **Primary Theme** | Warm Amber & Fresh Organic Stone (Light) | Slate & Indigo Mission Control (Dark) |
| **Primary Goal** | Minimize time to order & reduce queue stress | Maximize order throughput & eliminate kitchen delays |
| **Primary Target** | Mobile smartphones (360px–430px) | Wall-mounted displays (KDS), tablets, desktop |
| **Target Contrast** | WCAG AA (>= 4.5:1) | WCAG AAA (>= 7:1 for KDS tickets) |
| **Touch Targets** | 44px–48px | 48px–56px (Glove-compatible kitchen touchscreens) |
| **Deep Specification** | [docs/design_customer.md](docs/design_customer.md) | [docs/design_admin.md](docs/design_admin.md) |

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

For full color scales, component anatomy, layout grids, and interactive states:

- **Customer Design System Specification:** [docs/design_customer.md](docs/design_customer.md)
  - Color Tokens (`brand-50` to `brand-900`)
  - Veg / Non-Veg dietary badges
  - Menu cards & slot filters
  - Sticky bottom cart bar & checkout drawers
  - Order token cards

- **Admin & KDS Design System Specification:** [docs/design_admin.md](docs/design_admin.md)
  - Dark Slate Tokens (`admin-50` to `admin-900` + `slate-950`)
  - Order State Machine badges (Queued, Cooking, Ready, Collected, Cancelled)
  - Kitchen Display System (KDS) 10-foot legibility specs
  - High-density inventory tables with 1-click availability ("86") toggles
  - Audio and visual alarm states

---

## 4. Phase 4.1 Subsystem Design Guidelines

### 4.1 Testing Wallet & Demo Credit Notices
- **Disclaimer Badges:** All testing wallet interfaces (customer wallet dashboard, checkout payment selector, header balance indicator, admin wallet controls) must prominently display:
  `"Testing Wallet — Demo Credits Only. No Real Money."`
- **Color Codes:** Amber/Yellow styling (`bg-amber-500/10 text-amber-500 border-amber-500/30`) to emphasize simulated test tokens and prevent user confusion with real financial instruments.
- **Ledger Records:** Green (`+₹X.XX`, `text-emerald-600` / `text-emerald-400`) for credits/adjustments, Red (`-₹X.XX`, `text-rose-600` / `text-rose-400`) for debits and checkout payments.

### 4.2 High-Contrast QR Code Pass & Verification
- **Token Format:** Cryptographically generated token format `#CAF-QR-XXXXXX`, displayed in bold monospace font (`font-mono text-lg font-bold`).
- **QR SVG Rendering:** Pure SVG client rendering (`qrcode` library) with dark module contrast (`#0f172a` or `#000000`) on high-contrast white card container with rounded corners and `p-4` padding, optimized for handheld optical camera recognition.
- **Scanner Viewfinder:** Responsive video viewport with optical scan guide overlay and instant manual token input fallback.

### 4.3 Printable Receipts (`@media print`)
- **Monochrome & High Contrast:** Pure black-on-white typography (`#000000` text on `#ffffff` background) designed for standard 80mm POS thermal printers or office inkjet/laser printers.
- **CSS Print Media Queries:** Strict `@media print` rules hiding headers, footers, breadcrumbs, action buttons, and navigation elements (`.no-print { display: none !important; }`), ensuring crisp zero-margin page output (`@page { margin: 8mm; }`).

### 4.4 Strict 3-Stage Order Lifecycles & Collection UX (Phase 4.2)
- **Canonical 3 Stages:**
  - `ORDER_PLACED`: Amber status badge (`bg-amber-100 text-amber-800`), neutral waiting state.
  - `READY_TO_PICK`: Emerald status badge (`bg-emerald-100 text-emerald-800 animate-pulse ring-2 ring-emerald-500/20`), prominent green alert banner notifying customer that food is ready for counter pickup.
  - `COLLECTED`: Neutral slate badge (`bg-stone-100 text-stone-700`), permanently expired QR state.
- **Scanner Pre-flight Safety UX:**
  - Scanning a QR code displays full customer details and order item checklist without mutating state.
  - If scanned in `ORDER_PLACED`, displays amber caution: `"Order is not ready for pickup yet"` with a 1-click `"Mark Ready to Pick"` action.
  - If scanned in `READY_TO_PICK`, displays green ready check and enables the explicit `"Confirm Order Collection"` button.
  - If scanned in `COLLECTED`, displays a permanent red/stone notice: `"Order already collected"` with collection timestamp and all action buttons disabled.
- **Customer QR Invalidation:**
  - When in `COLLECTED` stage, customer tracking and receipt pages replace the scannable SVG QR code with an `"Order Already Collected"` badge to prevent confusion or double pickup attempts.

---

## 5. Subsystem Behavioral Guides

- [docs/order-lifecycle.md](docs/order-lifecycle.md): Strict 3-stage order lifecycle (`ORDER_PLACED` -> `READY_TO_PICK` -> `COLLECTED`), QR invalidation, atomic collection, and 5-step verification guide.
- [docs/orders.md](docs/orders.md): Order status progression, token format (`#CAF-YYMMDD-XXXX`), and concurrency locking.
- [docs/inventory.md](docs/inventory.md): Stock tracking, threshold warning states, and cancellation restoration rules.
- [docs/cart-and-checkout.md](docs/cart-and-checkout.md): Shopping cart persistence, review flow, and unpaid development state.
- [docs/testing-wallet.md](docs/testing-wallet.md): Non-monetary testing wallet, integer paise, auditable transaction ledger, and admin adjustments.
- [docs/qr-verification.md](docs/qr-verification.md): QR verification tokens, camera scanner, counter collection state transitions, and printable receipts.
