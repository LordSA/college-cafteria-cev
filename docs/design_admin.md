# Admin & KDS Design System — Cafteria

> **Audience:** Canteen Administrators, Cashier Counter Staff, Kitchen Operators & Chefs  
> **Target Devices:** Kitchen wall-mounted monitors (1080p/4K), Cashier tablets (iPad / Android), and Desktop management consoles  
> **Personality:** Mission-Critical, High-Contrast, Data-Dense, Focused, Resilient  
> **Framework:** Next.js (Static Export), Tailwind CSS, Lucide React

---

## 1. Visual Identity & Color Tokens

The Admin and Kitchen Display System (KDS) uses a high-contrast dark slate foundation to reduce eye strain in humid, harshly lit kitchen environments and to make urgent order tickets instantly legible from a distance of 6 to 10 feet.

### 1.1 Admin Slate Palette
Defined in `admin/tailwind.config.ts` under `admin`:

| Token | Hex Value | Usage |
|---|---|---|
| `admin-50` | `#f8fafc` | Inverted surfaces, high-contrast modal text |
| `admin-100` | `#f1f5f9` | Primary headings, prominent badge text |
| `admin-200` | `#e2e8f0` | Standard body text, active icon strokes |
| `admin-300` | `#cbd5e1` | Secondary labels, subtle card titles |
| `admin-400` | `#94a3b8` | Muted labels, timestamps, table column headers |
| `admin-500` | `#64748b` | Disabled states, subtle borders |
| `admin-600` | `#475569` | Interactive hover borders, divider lines |
| `admin-700` | `#334155` | Secondary card borders, card outlines |
| `admin-800` | `#1e293b` | Elevate surface cards, table row hover, inputs |
| `admin-900` | `#0f172a` | Header background, side navigation |
| Root / Background | `#020617` (`slate-950`) | Full-screen app background |

### 1.2 Operational State Colors (Kitchen Pipeline)

Order statuses must be immediately identifiable at a glance without reading text:

| Order Status | Primary Color | Class Tokens | Meaning |
|---|---|---|---|
| **New / Queued** | Electric Blue / Indigo | `bg-indigo-950/60 border-indigo-500 text-indigo-300` | Fresh order placed by student, needs cooking |
| **In Preparation** | Vivid Amber | `bg-amber-950/60 border-amber-500 text-amber-300` | Actively cooking on the stove / counter |
| **Ready for Pickup** | Emerald Green | `bg-emerald-950/60 border-emerald-500 text-emerald-300` | Packaged & plated on pickup shelf |
| **Completed / Collected** | Cool Muted Slate | `bg-slate-900 border-slate-700 text-slate-400` | Picked up and verified |
| **Cancelled / Refunded** | Crimson Rose | `bg-rose-950/60 border-rose-500 text-rose-300` | Cancelled by staff or auto-timeout |

### 1.3 Urgent & Alert Tokens
- **Order Age Warning (> 15 mins in queue):** Pulsing amber border (`border-amber-400 animate-pulse`).
- **Critical Delay (> 25 mins in queue):** Flashing red accent (`border-red-500 bg-red-950/80`).
- **Out of Stock Toggle (86'd):** Strikethrough text with red pill badge (`bg-rose-900/60 text-rose-200`).

---

## 2. Typography & Tabular Figures

Precision and speed are paramount in kitchen tickets and financial balance sheets:

| Role | Font & Styling | Purpose |
|---|---|---|
| **Token Number** | `font-mono text-2xl sm:text-3xl font-black tracking-tight` | Massive ticket identifier (`#A-104`) visible from 10ft |
| **Elapsed Timer** | `font-mono tabular-nums text-sm font-semibold` | Minutes elapsed since placement (`08:42`) |
| **Item Quantity** | `font-bold text-lg text-emerald-400` | Highlights multiplier (`3x Veg Biryani`) |
| **Price & Settlement** | `font-mono tabular-nums text-sm` | Prevents table jitter during live updates |
| **Status Badge** | `text-xs font-bold uppercase tracking-wider` | State indicators |

---

## 3. Screen Layouts & Modalities

### 3.1 Kitchen Display System (KDS) View
- Full-screen, edge-to-edge layout (`h-screen overflow-hidden`).
- **Multi-Column Ticket Flow:** 4 to 5 responsive columns displaying active order cards.
- **Card Anatomy:**
  - Header: Token `#T-09`, Timestamp, Elapsed timer badge, Pickup Slot ("12:30 PM Break").
  - Body: High-contrast item list with custom modifiers highlighted (e.g. "No onions", "Extra chutney").
  - Footer: Single tap action button ("Start Cooking" -> "Mark Ready" -> "Complete").
- **Touch-Friendly Buttons:** Minimum button height on KDS touchscreens is **56px** to accommodate busy kitchen staff wearing gloves.

### 3.2 Menu & Inventory Management Portal
- **High-Density Table View:**
  - Column sort headers: Item Name, Category, Price, Meal Slot, Daily Stock, Quick Toggle.
  - Quick availability toggle switch: Instant single-click disable to "86" an item when ingredients run out.
  - Price editing with inline validation.

### 3.3 Cashier Quick Counter
- Split screen: Left side live queue search (by token or student ID), Right side ticket verification and one-click pickup confirmation.

---

## 4. Audio Cues & Accessibility

- **Audible Ping:** High-pitch two-tone chime when a new paid order arrives on the KDS board.
- **Emergency Tone:** Warning buzzer if an order remains uncollected for over 30 minutes.
- **Contrast Standards:** KDS tokens and order items strictly target **WCAG AAA** contrast ratios (> 7:1) against the dark background.
- **Glare Reduction:** Avoid pure `#000000` pitch blacks to prevent reflection under bright commercial kitchen strip lighting; use deep obsidian slate `#020617` instead.
