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

## 4. Subsystem Behavioral Guides

- [docs/orders.md](docs/orders.md): Order status progression, token format (`#CAF-YYMMDD-XXXX`), and concurrency locking.
- [docs/inventory.md](docs/inventory.md): Stock tracking, threshold warning states, and cancellation restoration rules.
- [docs/cart-and-checkout.md](docs/cart-and-checkout.md): Shopping cart persistence, review flow, and unpaid development state.
